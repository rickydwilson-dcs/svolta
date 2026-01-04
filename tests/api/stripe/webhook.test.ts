/**
 * Stripe Webhook API Tests
 *
 * Tests for /api/stripe/webhook endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createMockStripeEvent,
  createMockCheckoutSession,
  createMockStripeSubscription,
} from '../test-utils';

// Mock environment variables
const originalEnv = process.env;

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn().mockReturnThis();
const mockSupabaseEq = vi.fn().mockReturnThis();
const mockSupabaseSingle = vi.fn();
const mockSupabaseUpsert = vi.fn().mockReturnThis();
const mockSupabaseInsert = vi.fn().mockReturnThis();
const mockSupabaseUpdate = vi.fn().mockReturnThis();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
      upsert: mockSupabaseUpsert,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
    }),
  })),
}));

// Mock Stripe webhook verification
const mockConstructWebhookEvent = vi.fn();
vi.mock('@/lib/stripe/server', () => ({
  constructWebhookEvent: mockConstructWebhookEvent,
}));

describe('Stripe Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    };

    // Default mock implementations
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null });
    mockSupabaseUpsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });
    mockSupabaseInsert.mockResolvedValue({ error: null });
    mockSupabaseUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Signature Verification', () => {
    it('should reject requests without stripe-signature header', async () => {
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing stripe-signature header');
    });

    it('should reject requests with invalid signature', async () => {
      mockConstructWebhookEvent.mockRejectedValue(new Error('Invalid signature'));

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid signature');
    });
  });

  describe('Livemode Check', () => {
    it('should reject test events in production', async () => {
      process.env.NODE_ENV = 'production';

      const testEvent = createMockStripeEvent('checkout.session.completed', {}, false);
      mockConstructWebhookEvent.mockResolvedValue(testEvent);

      // Need to re-import to get new env
      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Test events rejected in production');
    });

    it('should allow test events in development', async () => {
      process.env.NODE_ENV = 'development';

      const testEvent = createMockStripeEvent(
        'checkout.session.completed',
        createMockCheckoutSession('user-123', 'cus_123', 'sub_123'),
        false
      );
      mockConstructWebhookEvent.mockResolvedValue(testEvent);

      // Mock idempotency check - no existing event
      mockSupabaseSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Idempotency', () => {
    it('should skip duplicate events', async () => {
      const event = createMockStripeEvent('checkout.session.completed', {});
      mockConstructWebhookEvent.mockResolvedValue(event);

      // Mock existing event found
      mockSupabaseSingle.mockResolvedValue({ data: { id: 'existing-event' }, error: null });

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.duplicate).toBe(true);
    });

    it('should record new events before processing', async () => {
      const session = createMockCheckoutSession('user-123', 'cus_123', 'sub_123');
      const event = createMockStripeEvent('checkout.session.completed', session);
      mockConstructWebhookEvent.mockResolvedValue(event);

      // Mock no existing event
      mockSupabaseSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(mockSupabaseInsert).toHaveBeenCalled();
    });

    it('should handle race condition with unique constraint', async () => {
      const event = createMockStripeEvent('checkout.session.completed', {});
      mockConstructWebhookEvent.mockResolvedValue(event);

      // Mock no existing event on first check
      mockSupabaseSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      // Mock unique constraint violation on insert (another worker got it)
      mockSupabaseInsert.mockResolvedValue({ error: { code: '23505' } });

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.duplicate).toBe(true);
    });
  });

  describe('Event Handlers', () => {
    beforeEach(() => {
      // Mock no existing event and successful insert
      mockSupabaseSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      mockSupabaseInsert.mockResolvedValue({ error: null });
    });

    it('should handle checkout.session.completed', async () => {
      const session = createMockCheckoutSession('user-123', 'cus_123', 'sub_123');
      const event = createMockStripeEvent('checkout.session.completed', session);
      mockConstructWebhookEvent.mockResolvedValue(event);

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseUpsert).toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated', async () => {
      const subscription = createMockStripeSubscription('cus_123', 'price_pro_monthly');
      const event = createMockStripeEvent('customer.subscription.updated', subscription);
      mockConstructWebhookEvent.mockResolvedValue(event);

      // Mock finding user by customer ID
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // idempotency check
        .mockResolvedValueOnce({ data: { id: 'user-123' }, error: null }); // profile lookup

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle customer.subscription.deleted', async () => {
      const subscription = createMockStripeSubscription('cus_123', 'price_pro_monthly', 'canceled');
      const event = createMockStripeEvent('customer.subscription.deleted', subscription);
      mockConstructWebhookEvent.mockResolvedValue(event);

      // Mock finding user by customer ID
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // idempotency check
        .mockResolvedValueOnce({ data: { id: 'user-123' }, error: null }); // profile lookup

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });

    it('should handle invoice.payment_failed', async () => {
      const invoice = {
        id: 'inv_123',
        customer: 'cus_123',
        subscription: 'sub_123',
      };
      const event = createMockStripeEvent('invoice.payment_failed', invoice);
      mockConstructWebhookEvent.mockResolvedValue(event);

      // Mock finding user by customer ID
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // idempotency check
        .mockResolvedValueOnce({ data: { id: 'user-123' }, error: null }); // profile lookup

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle invoice.payment_succeeded', async () => {
      const invoice = {
        id: 'inv_123',
        customer: 'cus_123',
        subscription: 'sub_123',
      };
      const event = createMockStripeEvent('invoice.payment_succeeded', invoice);
      mockConstructWebhookEvent.mockResolvedValue(event);

      // Mock finding user by customer ID
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // idempotency check
        .mockResolvedValueOnce({ data: { id: 'user-123' }, error: null }); // profile lookup

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle unknown event types gracefully', async () => {
      const event = createMockStripeEvent('unknown.event.type', {});
      mockConstructWebhookEvent.mockResolvedValue(event);

      vi.resetModules();
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
