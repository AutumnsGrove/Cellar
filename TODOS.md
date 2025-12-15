# Cellar - Project TODOs

## Phase 1: Foundation (MVP)

### Setup
- [ ] Initialize SvelteKit project with pnpm
- [ ] Configure Cloudflare adapter for SvelteKit
- [ ] Set up Cloudflare Worker project (wrangler)
- [ ] Create D1 database and initial migrations
- [ ] Configure R2 bucket bindings
- [ ] Set up Heartwood auth integration

### Database Schema
- [ ] Create `user_storage` table (quotas, usage tracking)
- [ ] Create `storage_files` table (file metadata)
- [ ] Create `storage_addons` table (purchased add-ons)
- [ ] Create `storage_exports` table (export jobs)
- [ ] Add necessary indexes for performance

### Storage Dashboard
- [ ] Build storage meter component (usage vs quota)
- [ ] Implement usage breakdown by product (Blog, Ivy, Profile, Themes)
- [ ] Add quota warning indicators (80%, 95%, 100%)
- [ ] Create usage trends chart (storage over time)

### File Browser
- [ ] Implement category view (images, attachments, documents)
- [ ] Implement source view (by product)
- [ ] Add search functionality
- [ ] Build file preview (images, documents)
- [ ] Display file metadata (size, date, dimensions)

### File Operations
- [ ] Implement single file download
- [ ] Implement delete to trash (soft delete)
- [ ] Implement restore from trash
- [ ] Implement empty trash (permanent delete)
- [ ] Add quota enforcement (block uploads at 100%)

### Cron Jobs
- [ ] Set up trash auto-deletion (30+ days old)
- [ ] Set up export cleanup (7+ days old)

## Phase 2: Export & Add-ons

### Export System
- [ ] Create export job queue
- [ ] Implement streamed zip generation (Durable Objects)
- [ ] Add full export option (all files)
- [ ] Add category export option
- [ ] Set up export email notifications
- [ ] Generate signed download URLs (7-day expiry)

### Storage Add-ons
- [ ] Create Stripe products for add-ons (+10GB, +50GB, +100GB)
- [ ] Implement add-on purchase flow
- [ ] Update quota after successful purchase
- [ ] Handle add-on cancellation

### API Endpoints
- [ ] `GET /api/storage` - quota and usage info
- [ ] `GET /api/storage/files` - paginated file list
- [ ] `DELETE /api/storage/files/:id` - move to trash
- [ ] `POST /api/storage/files/:id/restore` - restore from trash
- [ ] `DELETE /api/storage/trash` - empty trash
- [ ] `POST /api/storage/export` - start export job
- [ ] `GET /api/storage/export/:id` - export status
- [ ] `GET/POST /api/storage/addons` - list/purchase add-ons

## Phase 3: Polish

- [ ] Grid view with image thumbnails
- [ ] Bulk file selection and operations
- [ ] Sort options (date, size, name, type)
- [ ] Mobile-responsive design
- [ ] Cleanup suggestions ("large unused files")

## Testing

- [ ] Unit tests for quota calculations
- [ ] Unit tests for file operations
- [ ] Integration tests for upload/download flow
- [ ] Integration tests for export generation
- [ ] E2E tests for add-on purchase flow
- [ ] Load tests for file browser (10k files)

## Migration

- [ ] Write migration script for existing R2 files
- [ ] Populate `storage_files` from existing blog uploads
- [ ] Calculate initial `user_storage` totals
- [ ] Plan gradual rollout strategy

---

*Reference: [cellar-spec.md](./cellar-spec.md) for full specification*
