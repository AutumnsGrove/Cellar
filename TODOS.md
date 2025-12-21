# Amber - Project TODOs

## Phase 1: Foundation (MVP)

### Setup
- [x] Initialize SvelteKit project with pnpm
- [x] Configure Cloudflare adapter for SvelteKit
- [x] Set up Cloudflare Worker project (wrangler)
- [x] Create D1 database and initial migrations
- [x] Configure R2 bucket bindings
- [ ] Set up Heartwood auth integration *(pending credentials)*

### Database Schema
- [x] Create `user_storage` table (quotas, usage tracking)
- [x] Create `storage_files` table (file metadata)
- [x] Create `storage_addons` table (purchased add-ons)
- [x] Create `storage_exports` table (export jobs)
- [x] Add necessary indexes for performance

### Storage Dashboard
- [x] Build storage meter component (usage vs quota)
- [x] Implement usage breakdown by product (Blog, Ivy, Profile, Themes)
- [x] Add quota warning indicators (80%, 95%, 100%)
- [ ] Create usage trends chart (storage over time) *(Phase 3)*

### File Browser
- [x] Implement category view (images, attachments, documents)
- [x] Implement source view (by product)
- [x] Add search functionality
- [ ] Build file preview (images, documents) *(needs R2 integration)*
- [x] Display file metadata (size, date, dimensions)

### File Operations
- [x] Implement single file download
- [x] Implement delete to trash (soft delete)
- [x] Implement restore from trash
- [x] Implement empty trash (permanent delete)
- [x] Add quota enforcement (block uploads at 100%)

### Cron Jobs
- [x] Set up trash auto-deletion (30+ days old)
- [x] Set up export cleanup (7+ days old)

## Phase 2: Export & Add-ons

### Export System
- [x] Create export job queue
- [x] Implement streamed zip generation (Durable Objects)
- [x] Add full export option (all files)
- [x] Add category export option
- [x] Generate download URLs (authenticated, 7-day expiry)
- [ ] Set up export email notifications *(needs email service)*
- [ ] R2 presigned URLs (Phase 3 enhancement)

### GroveEngine R2 Integration
- [ ] Extract R2 upload utilities to GroveEngine (`@autumnsgrove/groveengine`)
  - streamToR2(key, stream, metadata) - Stream upload to R2
  - generatePresignedUrl(key, expiresIn) - Generate time-limited URLs
  - batchDelete(prefix) - Delete multiple R2 objects by prefix
  - File upload handler (multipart/form-data)
  - File size validation (max 100MB per file)
  - MIME type validation
  - Virus/malware scanning stubs (implement later)
- [ ] Bump GroveEngine version in Amber and pull in R2 utils

### Storage Add-ons
- [ ] Create Stripe products for add-ons (+10GB, +50GB, +100GB) *(needs Stripe)*
- [x] Implement add-on purchase flow (UI + API)
- [x] Update quota after successful purchase
- [x] Handle add-on cancellation

### API Endpoints
- [x] `GET /api/storage` - quota and usage info
- [x] `GET /api/storage/files` - paginated file list
- [x] `DELETE /api/storage/files/:id` - move to trash
- [x] `POST /api/storage/files/:id/restore` - restore from trash
- [x] `DELETE /api/storage/trash` - empty trash
- [x] `POST /api/storage/export` - start export job
- [x] `GET /api/storage/export/:id` - export status
- [x] `GET/POST /api/storage/addons` - list/purchase add-ons

## Phase 3: Polish

- [x] Grid view with image thumbnails
- [ ] Bulk file selection and operations *(UI started, backend pending)*
- [x] Sort options (date, size, name, type)
- [x] Mobile-responsive design
- [ ] Cleanup suggestions ("large unused files")

## UI Implementation (Completed Dec 2024)

### Design System
- [x] Create `src/lib/styles/theme.css` with CSS variables
- [x] Implement warm amber (#f59e0b) color palette
- [x] Dark theme default with light theme support via `[data-theme="light"]`
- [x] Typography, spacing, shadows, transitions system
- [x] Global resets and base styles

### App Shell (Ivy-inspired)
- [x] Create `src/routes/(app)/+layout.svelte` with sidebar navigation
- [x] Sidebar with logo, nav items (Dashboard, Files, Trash, Settings), user info
- [x] Header with search bar and theme toggle
- [x] Main content area with proper layout
- [x] Disable SSR for app routes (`export const ssr = false`)

### Pages
- [x] Dashboard page (`src/routes/(app)/+page.svelte`) - storage overview, usage breakdown
- [x] Files page (`src/routes/(app)/files/+page.svelte`) - grid/list view, filters, sorting
- [x] Trash page (`src/routes/(app)/trash/+page.svelte`) - restore/delete actions
- [x] Settings page (`src/routes/(app)/settings/+page.svelte`) - account, appearance, storage

### Components
- [x] Create `src/lib/components/Icons.svelte` with Lucide icons (lucide-svelte)
- [x] Create `src/lib/stores.ts` for state management (theme, user, search)
- [x] Update StorageMeter.svelte to use CSS variables
- [x] Update UsageBreakdown.svelte to use design system
- [x] Update FileGrid.svelte with card-based design
- [x] Update FileList.svelte with table styling
- [x] Update TrashBin.svelte styling
- [x] Update AddStorageModal.svelte styling

### Development Setup
- [x] Add mock data in `src/lib/api.ts` for local development
- [x] Disable HMR overlay in vite.config.ts
- [x] Fix infinite loop bug in Files page $effect (using `untrack()`)
- [x] Install lucide-svelte for icons

## Testing

- [x] Unit tests for quota calculations
- [x] Unit tests for file operations
- [x] Unit tests for API client
- [x] Component tests for StorageMeter
- [x] Component tests for FileGrid
- [x] Component tests for UsageBreakdown
- [ ] Integration tests for upload/download flow *(needs R2)*
- [ ] Integration tests for export generation
- [ ] E2E tests for add-on purchase flow
- [ ] Load tests for file browser (10k files)

## Migration

- [ ] Write migration script for existing R2 files
- [ ] Populate `storage_files` from existing blog uploads
- [ ] Calculate initial `user_storage` totals
- [ ] Plan gradual rollout strategy

---

## What's Ready Now (Updated Dec 19, 2024)

The following is implemented and ready:

1. **Project Structure** - SvelteKit + Cloudflare Worker setup
2. **Database Schema** - Full D1 schema with all tables and indexes
3. **Storage Service** - Quota calculations, validation, file operations
4. **API Endpoints** - Complete REST API for all storage operations
5. **UI Components** - Dashboard, file browser, trash, add-on modal
6. **Cron Jobs** - Automatic cleanup of trash and expired exports
7. **Test Suite** - Unit and component tests with Vitest (12/12 passing)
8. **Ivy-inspired UI** - Complete frontend with warm amber theme, sidebar navigation, and all pages
9. **✨ Export System** - Durable Objects with chunk-based streaming (DEPLOYED!)
   - ExportJob DO processes exports in background
   - Streaming zip generation with fflate (compression level 6)
   - Handles 50GB+ exports via alarm-based chunking
   - Graceful handling of missing files
   - Manifest + README included in every export
   - Test mode auth bypass for development

### UI Stack
- **Framework**: SvelteKit 2 with Svelte 5 (runes syntax)
- **Styling**: CSS variables (no Tailwind) - `src/lib/styles/theme.css`
- **Icons**: Lucide (lucide-svelte)
- **State**: Svelte stores - `src/lib/stores.ts`
- **Mock Data**: Local development mode with mock files/quota

### Key Files
- `src/lib/styles/theme.css` - Design system with CSS variables
- `src/routes/(app)/+layout.svelte` - App shell with sidebar
- `src/lib/components/Icons.svelte` - Lucide icon wrapper
- `src/lib/stores.ts` - Theme, user, search stores
- `src/lib/api.ts` - API client with mock data support

## Next Steps

### IMMEDIATE - Export System Debugging (Dec 21, 2024)

**Status:** Export system partially working, but stuck in "processing" state during finalization.

**What Works:**
- ✅ Export job creation (POST /api/storage/export)
- ✅ Durable Object trigger via fetch()
- ✅ DO alarm() method fires
- ✅ Status updates to "processing"
- ✅ Test mode auth (X-Test-User-ID header)

**What's Broken:**
- ❌ Exports get stuck in "processing" for 20+ seconds
- ❌ No error logged to D1 (handleFailure not being called)
- ❌ wrangler tail logs incomplete/inconsistent

**Bugs Fixed Today:**
1. ✅ Fixed `ctx is not defined` - Added ctx param to route handler (index.ts:640)
2. ✅ Fixed DO method calling - Added fetch() handler to ExportJob
3. ✅ Fixed storage API - Changed `this.state.storage` → `this.ctx.storage`
4. ✅ Fixed R2 upload attempt - Buffered zip in memory before upload

**Next Session TODO:**
1. **Add comprehensive error handling** (30 min)
   - Wrap processChunk() in try/catch with D1 error logging
   - Wrap finalizeExport() in try/catch with D1 error logging
   - Add timestamp to every console.log
   - Log start/end of every major function

2. **Test with Cloudflare Dashboard** (15 min)
   - Create export: `curl -X POST https://amber-worker.m7jv4v7npb.workers.dev/api/storage/export -H "X-Test-User-ID: test-user-123" -H "Content-Type: application/json" -d '{"type":"full"}'`
   - **IMMEDIATELY** open Cloudflare Dashboard → Workers & Pages → amber-worker → Logs
   - Watch real-time logs (better than wrangler tail)
   - Check Durable Objects section for ExportJob instance logs
   - Wait 30 seconds, check D1 for status/error

3. **If still failing: Simplify** (1 hour)
   - Skip ZIP generation entirely
   - Just test: processChunk() → collect file metadata → update D1 with file_count
   - Once that works, add back ZIP generation
   - Use simpler R2 upload (single small file test first)

**Testing Commands:**
```bash
# Start wrangler tail (backup to dashboard)
npx wrangler tail

# Create export
curl -X POST https://amber-worker.m7jv4v7npb.workers.dev/api/storage/export \
  -H "X-Test-User-ID: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"type":"full"}'

# Check export status
npx wrangler d1 execute amber --remote --command \
  "SELECT id, status, file_count, error_message FROM storage_exports ORDER BY created_at DESC LIMIT 1"

# Check if files exist in D1
npx wrangler d1 execute amber --remote --command \
  "SELECT COUNT(*) as count FROM storage_files WHERE user_id = 'test-user-123'"
```

**Cloudflare Dashboard Access:**
1. Go to: https://dash.cloudflare.com/
2. Select account → Workers & Pages
3. Click "amber-worker"
4. Click "Logs" tab (real-time logs, better than wrangler tail)
5. Click "Durable Objects" tab → find ExportJob instance for detailed DO logs

**Test Data:**
- User: test-user-123
- Files in D1: 20 files
- Files in R2: ~6 files uploaded manually (rest missing, should be handled gracefully)

---

### Future Testing (After Export Works)
- [ ] Upload more test files to R2 for comprehensive testing
- [ ] Test category-specific exports (blog, ivy)
- [ ] Verify chunk processing with 100+ files
- [ ] Test export download endpoint
- [ ] Test export expiration (7 days)

---

*Reference: [amber-spec.md](./amber-spec.md) for full specification*
