/**
 * ExportJob Durable Object
 *
 * Handles background processing of file exports to ZIP archives.
 * Uses Durable Object alarms to process files in chunks, handling
 * large exports that exceed the request timeout limit.
 */

import { DurableObject } from 'cloudflare:workers';
import { ZipStreamer, createManifest, createReadme, ZIP_CONFIG } from './zipStream';
import type { Env } from '../index';

/**
 * State maintained across alarm invocations
 */
interface ExportState {
  exportId: string;
  userId: string;
  exportType: 'full' | 'blog' | 'ivy' | 'category';
  filterParams: Record<string, string> | null;
  currentOffset: number;
  processedFiles: Array<{
    id: string;
    r2_key: string;
    filename: string;
    size_bytes: number;
    product: string;
    category: string;
  }>;
  totalSize: number;
  missingFiles: string[];
  r2Key: string;
  createdAt: string;
}

/**
 * File record from D1 database
 */
interface FileRecord {
  id: string;
  r2_key: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  product: string;
  category: string;
  created_at: string;
}

/**
 * ExportJob Durable Object for processing large exports asynchronously
 */
export class ExportJob extends DurableObject<Env> {
  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const exportId = url.searchParams.get('exportId');

    console.log('[ExportJob] fetch() called with action:', action, 'exportId:', exportId);

    if (action === 'start' && exportId) {
      await this.startExport(exportId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Invalid action', { status: 400 });
  }

  /**
   * Start an export job by fetching metadata and scheduling processing
   */
  async startExport(exportId: string): Promise<void> {
    console.log('[ExportJob] startExport() called for export:', exportId);
    // Fetch export from D1 to get user_id, export_type, filter_params
    const result = await this.env.DB.prepare(
      'SELECT id, user_id, export_type, filter_params FROM storage_exports WHERE id = ?'
    )
      .bind(exportId)
      .first<{
        id: string;
        user_id: string;
        export_type: string;
        filter_params: string | null;
      }>();

    if (!result) {
      throw new Error(`Export ${exportId} not found`);
    }

    // Initialize state
    const state: ExportState = {
      exportId,
      userId: result.user_id,
      exportType: result.export_type as ExportState['exportType'],
      filterParams: result.filter_params ? JSON.parse(result.filter_params) : null,
      currentOffset: 0,
      processedFiles: [],
      totalSize: 0,
      missingFiles: [],
      r2Key: `exports/${result.user_id}/${exportId}/${Date.now()}-export.zip`,
      createdAt: new Date().toISOString()
    };

    // Store state in Durable Object storage
    await this.ctx.storage.put('export_state', JSON.stringify(state));

    // Update D1 to mark as processing
    console.log('[ExportJob] Updating status to processing');
    await this.env.DB.prepare(
      "UPDATE storage_exports SET status = 'processing' WHERE id = ?"
    )
      .bind(exportId)
      .run();

    // Schedule first alarm to start processing
    console.log('[ExportJob] Scheduling alarm in 1 second');
    await this.ctx.storage.setAlarm(Date.now() + 1000); // Start in 1 second
    console.log('[ExportJob] startExport() completed successfully');
  }

  /**
   * Alarm handler - processes chunks and schedules next iteration
   */
  async alarm(): Promise<void> {
    console.log('[ExportJob] alarm() triggered');
    const stateJson = await this.ctx.storage.get<string>('export_state');
    if (!stateJson) {
      console.error('[ExportJob] Export state not found in Durable Object storage');
      return;
    }

    const state: ExportState = JSON.parse(stateJson);
    console.log('[ExportJob] Processing chunk for export:', state.exportId, 'offset:', state.currentOffset);

    try {
      // Process next chunk of files
      const hasMoreChunks = await this.processChunk(state);

      // Update state
      await this.ctx.storage.put('export_state', JSON.stringify(state));

      if (hasMoreChunks) {
        // Schedule next chunk processing (delay to avoid rate limiting)
        const nextAlarmTime = Date.now() + 2000; // 2 second delay between chunks
        await this.ctx.storage.setAlarm(nextAlarmTime);
      } else {
        // All chunks processed, finalize the export
        await this.finalizeExport(state);
        // Clean up state after finalization
        await this.ctx.storage.delete('export_state');
      }
    } catch (error) {
      await this.handleFailure(state, error as Error);
      await this.ctx.storage.delete('export_state');
    }
  }

  /**
   * Process a single chunk of files
   * Fetches up to 100 files or 50MB of data
   * Returns true if more chunks exist
   */
  async processChunk(state: ExportState): Promise<boolean> {
    // Build query based on export type
    const query = this.buildFileQuery(state.exportType, state.filterParams);
    const [baseQuery, params] = query;

    // Fetch batch of files (100 files OR 50MB)
    const files = await this.env.DB.prepare(
      `${baseQuery} LIMIT ? OFFSET ?`
    )
      .bind(...params, ZIP_CONFIG.CHUNK_FILE_LIMIT, state.currentOffset)
      .all<FileRecord>();

    if (!files.results || files.results.length === 0) {
      return false; // No more files
    }

    // Fetch files from R2 in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < files.results.length; i += batchSize) {
      const batch = files.results.slice(i, i + batchSize);
      const promises = batch.map(async (file) => {
        try {
          const object = await this.env.R2_BUCKET.head(file.r2_key);
          if (!object) {
            state.missingFiles.push(file.r2_key);
            return;
          }

          // Store file metadata for later zipping
          state.processedFiles.push({
            id: file.id,
            r2_key: file.r2_key,
            filename: file.filename,
            size_bytes: file.size_bytes,
            product: file.product,
            category: file.category
          });

          state.totalSize += file.size_bytes;
        } catch (error) {
          console.warn(`Failed to check file ${file.r2_key}:`, error);
          state.missingFiles.push(file.r2_key);
        }
      });

      await Promise.all(promises);
    }

    // Log missing files
    if (state.missingFiles.length > 0) {
      console.info(
        `Export ${state.exportId}: ${state.missingFiles.length} files missing in R2`
      );
    }

    // Check if we've exceeded chunk size limit
    if (state.totalSize >= ZIP_CONFIG.CHUNK_SIZE_BYTES) {
      state.currentOffset += files.results.length;
      return true; // More chunks needed
    }

    // Check if we got fewer files than requested
    if (files.results.length < ZIP_CONFIG.CHUNK_FILE_LIMIT) {
      return false; // No more files available
    }

    // Update offset for next chunk
    state.currentOffset += files.results.length;
    return true; // More chunks available
  }

  /**
   * Finalize export by streaming all files to ZIP and uploading to R2
   */
  async finalizeExport(state: ExportState): Promise<void> {
    console.log('[ExportJob] Finalizing export, creating ZIP with', state.processedFiles.length, 'files');

    // Create readable/writable pair for the ZIP stream
    const { readable, writable } = new TransformStream<
      Uint8Array,
      Uint8Array
    >();

    const zipStreamer = new ZipStreamer(writable);

    // Buffer chunks from the readable stream
    const chunks: Uint8Array[] = [];
    const reader = readable.getReader();

    // Start reading chunks in background
    const bufferPromise = (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    })();

    // Add README
    await zipStreamer.addTextFile('README.txt', createReadme());

    // Create manifest from processed files
    const manifestEntries = state.processedFiles.map((file) => ({
      filename: file.filename,
      size: file.size_bytes,
      r2_key: file.r2_key,
      product: file.product,
      category: file.category
    }));
    await zipStreamer.addTextFile('manifest.json', createManifest(manifestEntries));

    // Stream files into ZIP
    for (const file of state.processedFiles) {
      const object = await this.env.R2_BUCKET.get(file.r2_key);
      if (!object?.body) {
        console.warn(`Skipping file ${file.r2_key} - not found during finalization`);
        continue;
      }

      await zipStreamer.addFile({
        filename: `${file.product}/${file.category}/${file.filename}`,
        data: object.body,
        size: file.size_bytes,
        mtime: new Date()
      });
    }

    await zipStreamer.close();

    // Wait for all chunks to be buffered
    await bufferPromise;

    // Combine chunks into single buffer
    console.log('[ExportJob] Collected', chunks.length, 'chunks, combining...');
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const zipBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      zipBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log('[ExportJob] Uploading ZIP to R2, size:', zipBuffer.length, 'bytes');

    // Upload to R2 with known length
    await this.env.R2_BUCKET.put(state.r2Key, zipBuffer, {
      customMetadata: {
        'export-id': state.exportId,
        'user-id': state.userId,
        'export-type': state.exportType,
        'file-count': state.processedFiles.length.toString(),
        'total-size': state.totalSize.toString()
      }
    });

    // Update D1 to mark as completed
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // +7 days
    await this.env.DB.prepare(
      `UPDATE storage_exports
       SET status = 'completed', r2_key = ?, expires_at = ?
       WHERE id = ?`
    )
      .bind(state.r2Key, expiresAt, state.exportId)
      .run();

    console.info(
      `Export ${state.exportId} completed: ${state.processedFiles.length} files, ${state.totalSize} bytes`
    );
  }

  /**
   * Handle export failure by updating D1 status
   */
  async handleFailure(state: ExportState, error: Error): Promise<void> {
    console.error(`Export ${state.exportId} failed:`, error);

    await this.env.DB.prepare(
      `UPDATE storage_exports
       SET status = 'failed', error_message = ?
       WHERE id = ?`
    )
      .bind(error.message, state.exportId)
      .run();
  }

  /**
   * Build D1 query based on export type and filters
   * Returns [queryString, params] tuple
   */
  private buildFileQuery(
    exportType: string,
    filters: Record<string, string> | null
  ): [string, unknown[]] {
    const baseQuery = `
      SELECT id, r2_key, filename, size_bytes, mime_type, product, category, created_at
      FROM storage_files
      WHERE user_id = ? AND deleted_at IS NULL
    `;

    const params: unknown[] = [];

    // Get userId from state
    params.push(''); // Placeholder - will be filled by caller

    let typeCondition = '';

    switch (exportType) {
      case 'full':
        // Export everything
        typeCondition = '';
        break;
      case 'blog':
        typeCondition = ' AND product = ?';
        params.push('blog');
        break;
      case 'ivy':
        typeCondition = ' AND product = ?';
        params.push('ivy');
        break;
      case 'category':
        if (filters?.category) {
          typeCondition = ' AND category = ?';
          params.push(filters.category);
        }
        break;
    }

    return [baseQuery + typeCondition + ' ORDER BY created_at DESC', params];
  }
}

/**
 * TODO: Add R2 utilities to @autumnsgrove/groveengine
 * Consider extracting file streaming, chunking, and ZIP creation
 * utilities into groveengine for reuse across projects
 */
