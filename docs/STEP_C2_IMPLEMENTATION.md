# Step C2: Background Upload API Implementation

**Status:** Complete ✅
**Date:** 2026-01-01
**Feature:** Custom Background Upload for Pro Users

## Summary

Implemented the backend API and database changes to support custom branded background uploads for Pro users. This includes Supabase Storage integration, database schema updates, and comprehensive API routes.

## Files Created

### 1. API Route

- **Path:** `/app/api/backgrounds/upload/route.ts` (6.4KB)
- **Methods:** POST (upload), DELETE (remove)
- **Features:**
  - Authentication verification
  - Pro subscription check
  - File validation (2MB max, JPG/PNG/WebP)
  - Supabase Storage upload
  - Profile URL update

### 2. Database Migrations

- **Path:** `/supabase/migrations/20260101175435_add_custom_background.sql` (651B)
  - Adds `custom_background_url` column to profiles
  - Creates index for performance

- **Path:** `/supabase/migrations/20260101175436_create_backgrounds_bucket.sql` (1.5KB)
  - Creates `backgrounds` storage bucket
  - Implements RLS policies (users own their backgrounds)
  - Enables public read access

- **Path:** `/supabase/migrations/README.md`
  - Migration documentation
  - Application instructions
  - Rollback procedures

### 3. TypeScript Types

- **Path:** `/types/database.ts` (updated)
  - Added `custom_background_url: string | null` to Profile types
  - Updated Insert and Update types

### 4. Test Suite

- **Path:** `/__tests__/api/backgrounds.test.ts`
  - Comprehensive integration tests
  - Authentication tests
  - File validation tests
  - RLS policy tests

### 5. Documentation

- **Path:** `/docs/features/custom-backgrounds.md`
  - Complete feature documentation
  - API usage examples
  - Security model explanation
  - Testing checklist

## Quick Start

### 1. Apply Migrations

```bash
# Option A: Supabase CLI (recommended)
supabase db push

# Option B: Supabase Dashboard
# Copy/paste each SQL file in SQL Editor
```

### 2. Verify Setup

```sql
-- Check column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'custom_background_url';

-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'backgrounds';

-- Check RLS policies
SELECT policyname FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%background%';
```

### 3. Test API

```typescript
// Upload test
const formData = new FormData();
formData.append("file", imageFile);

const response = await fetch("/api/backgrounds/upload", {
  method: "POST",
  body: formData,
});

console.log(await response.json());
// { success: true, url: "https://..." }

// Delete test
const deleteResponse = await fetch("/api/backgrounds/upload", {
  method: "DELETE",
});

console.log(await deleteResponse.json());
// { success: true, message: "Custom background removed successfully" }
```

## API Endpoints

### POST /api/backgrounds/upload

Upload custom background image for Pro users.

**Request:**

- Content-Type: `multipart/form-data`
- Body: FormData with `file` field
- Auth: Required (Supabase session)

**Validation:**

- Max size: 2MB
- Allowed types: JPG, PNG, WebP
- Pro subscription required

**Response (200):**

```json
{
  "success": true,
  "url": "https://[project].supabase.co/storage/v1/object/public/backgrounds/{user_id}/custom-background.jpg",
  "message": "Custom background uploaded successfully"
}
```

**Errors:**

- `401` - Unauthorized (not logged in)
- `403` - Pro subscription required
- `400` - Invalid file (size/type)
- `500` - Upload failed

### DELETE /api/backgrounds/upload

Remove user's custom background.

**Request:**

- Method: DELETE
- Auth: Required (Supabase session)

**Response (200):**

```json
{
  "success": true,
  "message": "Custom background removed successfully"
}
```

## Database Schema

### profiles table (updated)

```sql
ALTER TABLE profiles ADD COLUMN custom_background_url TEXT;
```

| Column                | Type | Nullable | Description              |
| --------------------- | ---- | -------- | ------------------------ |
| custom_background_url | text | Yes      | Public URL to background |

### storage.buckets (new)

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true);
```

| Bucket ID   | Public | RLS Enabled |
| ----------- | ------ | ----------- |
| backgrounds | Yes    | Yes         |

### Storage RLS Policies

1. **Users can upload their own backgrounds** (INSERT)
   - Users can only upload to `{their_user_id}/` folder

2. **Users can update their own backgrounds** (UPDATE)
   - Users can only update files in `{their_user_id}/` folder

3. **Users can delete their own backgrounds** (DELETE)
   - Users can only delete files in `{their_user_id}/` folder

4. **Public read access to backgrounds** (SELECT)
   - Anyone can read files (required for exported images)

## File Storage Structure

```
backgrounds/
└── {user_id}/
    └── custom-background.{ext}  # jpg, png, or webp
```

**Example:**

```
backgrounds/
└── 550e8400-e29b-41d4-a716-446655440000/
    └── custom-background.jpg
```

**URL Format:**

```
https://[project].supabase.co/storage/v1/object/public/backgrounds/{user_id}/custom-background.{ext}
```

## Security

### Authentication

- Supabase Auth session required
- Verified on every request

### Authorization

- Pro subscription check: `subscription_tier === 'pro'`
- Active status check: `subscription_status === 'active'`

### Row Level Security

- Users can only modify their own folder
- Public read access for exported images
- Enforced at database level

### File Validation

- MIME type verification
- File size limit (2MB)
- Extension whitelist (JPG, PNG, WebP)

## Testing

Run the test suite:

```bash
npm run test __tests__/api/backgrounds.test.ts
```

**Test Coverage:**

- ✅ Authentication required
- ✅ Pro subscription required
- ✅ File size validation (2MB max)
- ✅ File type validation (JPG/PNG/WebP)
- ✅ Upload success
- ✅ Delete success
- ✅ Profile update
- ✅ RLS policy enforcement
- ✅ Overwrite on re-upload

## Integration with Frontend

The uploaded background URL can be accessed from the user profile:

```typescript
import { useUserStore } from '@/stores/user-store';

function ExportOptions() {
  const profile = useUserStore((state) => state.profile);
  const customBgUrl = profile?.custom_background_url;

  if (customBgUrl) {
    // User has uploaded a custom background
    return <BackgroundPreview url={customBgUrl} />;
  } else {
    // Show upload button
    return <BackgroundUploadButton />;
  }
}
```

## Next Steps

**Step C3:** UI Implementation

- Create BackgroundUploadButton component
- Add upload flow to ExportOptionsModal
- Implement preview of uploaded background
- Add delete background action
- Show upload progress indicator

## Rollback Instructions

If needed, rollback these changes:

```sql
-- Remove column
ALTER TABLE profiles DROP COLUMN IF EXISTS custom_background_url;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can upload their own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to backgrounds" ON storage.objects;

-- Remove bucket (WARNING: Deletes all files!)
DELETE FROM storage.buckets WHERE id = 'backgrounds';
```

## Troubleshooting

### Migration Fails

- Check Supabase connection
- Verify you have admin permissions
- Run migrations in order (by timestamp)

### Upload Returns 500

- Check Supabase Storage is enabled
- Verify bucket exists: `SELECT * FROM storage.buckets WHERE id = 'backgrounds'`
- Check RLS policies are active

### RLS Blocks Upload

- Verify user is authenticated
- Check `auth.uid()` matches upload path
- Review RLS policy definitions

### Public URL Not Accessible

- Verify bucket is public: `public = true`
- Check SELECT RLS policy exists
- Test URL in incognito mode

## Performance Notes

- **Upload:** Single transaction (storage + profile update)
- **Storage:** CDN-cached public URLs
- **File size:** 2MB limit balances quality and performance
- **Overwrite:** `upsert: true` prevents storage bloat

## Related Files

- **API Implementation:** `/app/api/backgrounds/upload/route.ts`
- **Database Types:** `/types/database.ts`
- **Test Suite:** `/__tests__/api/backgrounds.test.ts`
- **Documentation:** `/docs/features/custom-backgrounds.md`
- **Migration Docs:** `/supabase/migrations/README.md`

---

**Completed:** 2026-01-01
**Branch:** `feature/pro-export-options`
**Ready for:** Step C3 (UI Implementation)
