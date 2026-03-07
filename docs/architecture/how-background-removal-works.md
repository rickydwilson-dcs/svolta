# Custom Background Upload (Pro Feature)

**Feature:** Allow Pro users to upload custom branded backgrounds for their exports
**Status:** Step C2 - API and Database Implementation Complete
**Branch:** `feature/pro-export-options`

## Overview

This feature allows Pro subscribers to upload custom background images that can be used when exporting comparison photos. The background image is stored in Supabase Storage and referenced in the user's profile.

## Architecture

```
┌─────────────────┐
│  User (Pro)     │
└────────┬────────┘
         │
         │ POST /api/backgrounds/upload
         │ (FormData with image file)
         ▼
┌─────────────────────────────────┐
│  API Route                       │
│  /api/backgrounds/upload         │
│  - Auth check                    │
│  - Pro subscription check        │
│  - File validation (2MB, JPG/PNG)│
└────────┬────────────────────────┘
         │
         ├──────────────────────┬─────────────────────┐
         │                      │                     │
         ▼                      ▼                     ▼
┌──────────────────┐   ┌──────────────┐   ┌───────────────────┐
│ Supabase Storage │   │  Profile DB  │   │  Public URL       │
│  backgrounds/    │   │  update URL  │   │  Return to client │
│  {user_id}/      │   │              │   │                   │
│  custom-bg.jpg   │   │              │   │                   │
└──────────────────┘   └──────────────┘   └───────────────────┘
```

## Files Created

### 1. API Route

**File:** `/app/api/backgrounds/upload/route.ts`

Handles upload and deletion of custom backgrounds:

- `POST` - Uploads new background (overwrites existing)
- `DELETE` - Removes current background

**Key Features:**

- Authentication required
- Pro subscription verification
- File validation (max 2MB, JPG/PNG/WebP)
- Supabase Storage integration
- Profile update with public URL

### 2. Database Migrations

**File:** `/supabase/migrations/20260101175435_add_custom_background.sql`

Adds `custom_background_url` column to profiles table:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS custom_background_url TEXT;
```

**File:** `/supabase/migrations/20260101175436_create_backgrounds_bucket.sql`

Creates Supabase Storage bucket with RLS policies:

- Bucket: `backgrounds` (public read)
- Path structure: `{user_id}/custom-background.{ext}`
- RLS policies: Users can only modify their own backgrounds

### 3. TypeScript Types

**File:** `/types/database.ts`

Updated Profile interface to include:

```typescript
custom_background_url: string | null;
```

### 4. Test Suite

**File:** `/__tests__/api/backgrounds.test.ts`

Comprehensive integration tests for:

- Authentication checks
- Pro subscription verification
- File validation (size, type)
- Upload success scenarios
- Delete functionality
- RLS policy enforcement

## Database Schema

### Updated `profiles` Table

| Column                  | Type   | Nullable | Description                     |
| ----------------------- | ------ | -------- | ------------------------------- |
| `custom_background_url` | `text` | Yes      | Public URL to custom background |

**Index:** `idx_profiles_custom_background` on non-null values

### Storage Bucket: `backgrounds`

| Property | Value       | Description               |
| -------- | ----------- | ------------------------- |
| `id`     | backgrounds | Bucket identifier         |
| `name`   | backgrounds | Display name              |
| `public` | `true`      | Allows public read access |

**RLS Policies:**

- `Users can upload their own backgrounds` - INSERT
- `Users can update their own backgrounds` - UPDATE
- `Users can delete their own backgrounds` - DELETE
- `Public read access to backgrounds` - SELECT

## API Usage

### Upload Background

**Request:**

```typescript
const formData = new FormData();
formData.append("file", imageFile); // File object from <input type="file">

const response = await fetch("/api/backgrounds/upload", {
  method: "POST",
  body: formData,
});

const { success, url, message } = await response.json();
```

**Response (Success - 200):**

```json
{
  "success": true,
  "url": "https://[project].supabase.co/storage/v1/object/public/backgrounds/{user_id}/custom-background.jpg",
  "message": "Custom background uploaded successfully"
}
```

**Response (Error - 403):**

```json
{
  "error": "Pro subscription required",
  "message": "Upgrade to Pro to upload custom backgrounds"
}
```

**Response (Error - 400):**

```json
{
  "error": "File too large",
  "message": "Maximum file size is 2MB"
}
```

### Delete Background

**Request:**

```typescript
const response = await fetch("/api/backgrounds/upload", {
  method: "DELETE",
});

const { success, message } = await response.json();
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Custom background removed successfully"
}
```

## File Validation

### Size Limits

- **Maximum:** 2MB (2,097,152 bytes)
- **Recommended:** 500KB - 1MB for optimal performance

### Allowed Formats

- **JPEG** (`.jpg`, `.jpeg`) - `image/jpeg`
- **PNG** (`.png`) - `image/png`
- **WebP** (`.webp`) - `image/webp`

### Recommended Dimensions

- **Minimum:** 1920x1080 (Full HD)
- **Recommended:** 2560x1440 (2K)
- **Maximum:** 3840x2160 (4K)

## Security

### Authentication

- User must be logged in (Supabase Auth)
- Session token validated on every request

### Authorization

- Pro subscription required for upload
- User tier checked: `subscription_tier === 'pro'`
- Status verified: `subscription_status === 'active'`

### Row Level Security (RLS)

```sql
-- Users can only upload to their own folder
auth.uid()::text = (storage.foldername(name))[1]

-- Public can read (for exported images)
bucket_id = 'backgrounds'
```

### File Validation

- MIME type checked: `image/jpeg`, `image/png`, `image/webp`
- File size validated before upload
- Binary content type enforcement

## Implementation Steps

### 1. Apply Database Migrations

```bash
# Using Supabase CLI
supabase db push

# Or via Supabase Dashboard SQL Editor
# Run both migration files in order
```

### 2. Verify Storage Bucket

```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'backgrounds';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### 3. Test API Endpoints

```bash
# Test upload (requires auth token and Pro subscription)
curl -X POST http://localhost:3000/api/backgrounds/upload \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"

# Test delete
curl -X DELETE http://localhost:3000/api/backgrounds/upload \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

### 4. Update Frontend Components

See Step C3 for UI implementation:

- Background upload button in ExportOptionsModal
- Preview of uploaded background
- Delete background action

## Usage in Export Flow

Once uploaded, the custom background URL can be accessed:

```typescript
import { useUserStore } from '@/stores/user-store';

function ExportComponent() {
  const profile = useUserStore((state) => state.profile);

  const backgroundUrl = profile?.custom_background_url;

  if (backgroundUrl) {
    // Use custom background in export
    canvas.setBackgroundImage(backgroundUrl, ...);
  } else {
    // Use default gradient/color
  }
}
```

## Error Handling

### Common Errors

| Status | Error                     | Cause           | Solution                 |
| ------ | ------------------------- | --------------- | ------------------------ |
| 401    | Unauthorized              | Not logged in   | Redirect to login        |
| 403    | Pro subscription required | Free user       | Show upgrade prompt      |
| 400    | File too large            | Size > 2MB      | Compress image           |
| 400    | Invalid file type         | Wrong MIME type | Convert to JPG/PNG       |
| 500    | Upload failed             | Storage error   | Retry or contact support |

### User-Facing Messages

```typescript
const ERROR_MESSAGES = {
  401: "Please log in to upload custom backgrounds",
  403: "Upgrade to Pro to use custom backgrounds",
  400: "Please upload a JPG or PNG image under 2MB",
  500: "Upload failed. Please try again or contact support",
};
```

## Testing Checklist

- [ ] Apply database migrations
- [ ] Verify storage bucket exists
- [ ] Test upload with Pro user (JPG)
- [ ] Test upload with Pro user (PNG)
- [ ] Test upload with Pro user (WebP)
- [ ] Test upload with Free user (should fail)
- [ ] Test upload without auth (should fail)
- [ ] Test upload > 2MB file (should fail)
- [ ] Test upload invalid type (should fail)
- [ ] Test delete with background
- [ ] Test delete without background
- [ ] Verify profile URL updated after upload
- [ ] Verify profile URL cleared after delete
- [ ] Test RLS (user can't access others' backgrounds)
- [ ] Test public read access to backgrounds
- [ ] Test re-upload (should overwrite)

## Performance Considerations

### Storage Optimization

- Files stored with `upsert: true` (overwrites previous)
- Only one background per user (path: `{user_id}/custom-background.{ext}`)
- Public bucket enables CDN caching

### API Performance

- Single round-trip for upload + profile update
- Concurrent operations (upload and update)
- No file processing (stored as-is)

### Bandwidth

- 2MB max per upload
- Public URL referenced in exports (no repeated downloads)
- Browser caching enabled

## Future Enhancements

### Phase 2 (Potential)

- [ ] Image cropping/resizing UI
- [ ] Multiple background templates
- [ ] Brand color extraction from background
- [ ] Background library (saved backgrounds)
- [ ] Server-side image optimization

### Phase 3 (Potential)

- [ ] Team/organization shared backgrounds
- [ ] Background usage analytics
- [ ] Auto-detect logo position
- [ ] Background presets (gym brands)

## Related Documentation

- **Database Schema:** `/docs/architecture/database.md`
- **User Store:** `/stores/user-store.ts`
- **Export Hook:** `/hooks/useCanvasExport.ts`
- **Supabase Storage:** [Supabase Storage Docs](https://supabase.com/docs/guides/storage)

## Support

For issues or questions:

1. Check migration status in Supabase Dashboard
2. Verify RLS policies are active
3. Check API route logs for errors
4. Test with Supabase SQL Editor
5. Contact: [support email or link]

---

**Last Updated:** 2026-01-01
**Implemented By:** Backend Engineer
**Next Step:** C3 - UI Implementation
