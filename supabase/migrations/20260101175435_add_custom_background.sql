-- Migration: Add custom background URL to profiles
-- Created: 2026-01-01
-- Description: Adds custom_background_url column to profiles table for Pro users

-- Add custom background URL column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS custom_background_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.custom_background_url IS 'URL to user uploaded custom background image for exports (Pro feature)';

-- Create index for faster lookups (optional, but good for queries that filter by this)
CREATE INDEX IF NOT EXISTS idx_profiles_custom_background ON profiles(custom_background_url) WHERE custom_background_url IS NOT NULL;
