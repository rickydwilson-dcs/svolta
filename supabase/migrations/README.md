# Supabase Migrations

This directory contains SQL migrations for the Svolta database schema.

## Migration Files

| File                                           | Description                                     | Date       |
| ---------------------------------------------- | ----------------------------------------------- | ---------- |
| `20260101175435_add_custom_background.sql`     | Adds `custom_background_url` column to profiles | 2026-01-01 |
| `20260101175436_create_backgrounds_bucket.sql` | Creates backgrounds storage bucket with RLS     | 2026-01-01 |

## Applying Migrations

### Option 1: Supabase CLI (Recommended)

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### Option 2: Supabase Dashboard

1. Go to your project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file content
4. Execute in order (by timestamp)

### Option 3: Direct SQL Execution

```bash
# Using psql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < supabase/migrations/20260101175435_add_custom_background.sql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < supabase/migrations/20260101175436_create_backgrounds_bucket.sql
```

## Verification

After applying migrations, verify:

```sql
-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'custom_background_url';

-- Check bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'backgrounds';

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%background%';
```

## Rollback

If needed, rollback these changes:

```sql
-- Remove column
ALTER TABLE profiles DROP COLUMN IF EXISTS custom_background_url;

-- Drop policies (replace with actual policy names if different)
DROP POLICY IF EXISTS "Users can upload their own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to backgrounds" ON storage.objects;

-- Remove bucket (WARNING: This deletes all files!)
DELETE FROM storage.buckets WHERE id = 'backgrounds';
```

## Testing the Storage Bucket

```typescript
// Test upload
const formData = new FormData();
formData.append("file", imageFile);

const response = await fetch("/api/backgrounds/upload", {
  method: "POST",
  body: formData,
});

const { success, url } = await response.json();
console.log("Uploaded to:", url);

// Test delete
const deleteResponse = await fetch("/api/backgrounds/upload", {
  method: "DELETE",
});

console.log(await deleteResponse.json());
```

## Notes

- **Bucket is public**: Required for exported images to reference backgrounds
- **Security via RLS**: Users can only modify their own backgrounds
- **File path pattern**: `{user_id}/custom-background.{ext}`
- **Upsert enabled**: Uploading overwrites previous background
- **Max file size**: 2MB (enforced in API route)
- **Allowed formats**: JPG, PNG, WebP

## Related Files

- API Route: `/app/api/backgrounds/upload/route.ts`
- Database Schema: `/docs/architecture/database.md`
