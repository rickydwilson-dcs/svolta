/**
 * API Test Utilities
 *
 * Shared mocks and helpers for testing API routes
 */

import { vi } from 'vitest';

// Mock user data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

export const mockProUser = {
  ...mockUser,
  id: 'pro-user-123',
  email: 'pro@example.com',
};

// Mock subscription data
export const mockFreeSubscription = {
  id: 'sub-free-123',
  user_id: mockUser.id,
  tier: 'free' as const,
  status: 'active' as const,
  stripe_subscription_id: null,
  stripe_customer_id: null,
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const mockProSubscription = {
  ...mockFreeSubscription,
  id: 'sub-pro-123',
  user_id: mockProUser.id,
  tier: 'pro' as const,
  stripe_subscription_id: 'sub_stripe_123',
  stripe_customer_id: 'cus_stripe_123',
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

// Mock usage data
export const mockUsage = {
  id: 'usage-123',
  user_id: mockUser.id,
  month: '2026-01',
  exports_count: 3,
  last_export_at: '2026-01-01T12:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T12:00:00.000Z',
};

// Mock Stripe event factory
export function createMockStripeEvent(type: string, data: Record<string, unknown>, livemode = true) {
  return {
    id: `evt_${Math.random().toString(36).substring(7)}`,
    type,
    livemode,
    data: {
      object: data,
    },
    created: Math.floor(Date.now() / 1000),
    api_version: '2023-10-16',
  };
}

// Mock Stripe checkout session
export function createMockCheckoutSession(userId: string, customerId: string, subscriptionId: string) {
  return {
    id: `cs_${Math.random().toString(36).substring(7)}`,
    customer: customerId,
    subscription: subscriptionId,
    metadata: {
      user_id: userId,
    },
    mode: 'subscription',
    status: 'complete',
    payment_status: 'paid',
  };
}

// Mock Stripe subscription
export function createMockStripeSubscription(customerId: string, priceId: string, status = 'active') {
  return {
    id: `sub_${Math.random().toString(36).substring(7)}`,
    customer: customerId,
    status,
    items: {
      data: [
        {
          price: {
            id: priceId,
          },
        },
      ],
    },
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    cancel_at_period_end: false,
    metadata: {},
  };
}

// Create mock Supabase client
export function createMockSupabaseClient() {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockUpsert = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();

  return {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      upsert: mockUpsert,
      insert: mockInsert,
      update: mockUpdate,
    })),
    _mocks: {
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      upsert: mockUpsert,
      insert: mockInsert,
      update: mockUpdate,
    },
  };
}

// Helper to create NextRequest-like object
export function createMockRequest(options: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
} = {}) {
  const { method = 'GET', body, headers = {} } = options;

  return {
    method,
    headers: new Headers(headers),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
    json: vi.fn().mockResolvedValue(body),
  };
}

// Helper to parse NextResponse
export async function parseResponse(response: Response) {
  const data = await response.json();
  return {
    status: response.status,
    data,
  };
}
