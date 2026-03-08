-- Remove stale billing columns from profiles.
-- Canonical subscription state lives in the subscriptions table.
-- Verified: no RPC, policy, or runtime code reads these columns.
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_status;
