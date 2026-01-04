-- Add webhook_events table for idempotency
-- Prevents duplicate processing of Stripe webhook events

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by Stripe event ID
CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);

-- Enable RLS (deny all access - only service role can write)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Cleanup old events (keep 30 days)
-- Run this periodically via pg_cron or similar
COMMENT ON TABLE webhook_events IS 'Stores processed Stripe webhook events for idempotency. Events older than 30 days can be safely deleted.';
