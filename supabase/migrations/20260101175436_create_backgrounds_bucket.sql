-- Migration: Create backgrounds storage bucket with RLS policies
-- Created: 2026-01-01
-- Description: Creates Supabase Storage bucket for custom background images with appropriate security policies

-- Create backgrounds storage bucket (public for read access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Users can upload their own backgrounds
-- Uses storage.foldername() to extract user_id from path
CREATE POLICY "Users can upload their own backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can update their own backgrounds
CREATE POLICY "Users can update their own backgrounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can delete their own backgrounds
CREATE POLICY "Users can delete their own backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Public read access to all backgrounds
-- This allows exported images to reference background URLs
CREATE POLICY "Public read access to backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'backgrounds');

-- Add comment for documentation
COMMENT ON TABLE storage.objects IS 'Storage objects with RLS policies. backgrounds bucket allows users to upload custom backgrounds (Pro feature)';
