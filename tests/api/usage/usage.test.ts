/**
 * Usage API Tests
 *
 * Tests for /api/usage and /api/usage/increment endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  mockUser,
  mockProUser,
  mockFreeSubscription,
  mockProSubscription,
  mockUsage,
} from '../test-utils';
import { FREE_EXPORT_LIMIT } from '@/lib/stripe/plans';

// Mock Supabase server client
const mockSupabaseAuth = {
  getUser: vi.fn(),
};
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn().mockReturnThis();
const mockSupabaseEq = vi.fn().mockReturnThis();
const mockSupabaseSingle = vi.fn();
const mockSupabaseUpsert = vi.fn().mockReturnThis();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
      upsert: mockSupabaseUpsert,
    }),
  })),
}));

describe('Usage API - GET /api/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const { GET } = await import('@/app/api/usage/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return usage data for free user', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock subscription check
    mockSupabaseSingle
      .mockResolvedValueOnce({ data: mockFreeSubscription, error: null }) // subscription
      .mockResolvedValueOnce({ data: mockUsage, error: null }); // usage

    vi.resetModules();
    const { GET } = await import('@/app/api/usage/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exports_count).toBe(mockUsage.exports_count);
    expect(data.limit).toBe(FREE_EXPORT_LIMIT);
    expect(data.remaining).toBe(FREE_EXPORT_LIMIT - mockUsage.exports_count);
    expect(data.is_pro).toBe(false);
  });

  it('should return unlimited for pro user', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockProUser },
      error: null,
    });

    // Mock pro subscription
    mockSupabaseSingle
      .mockResolvedValueOnce({ data: mockProSubscription, error: null }) // subscription
      .mockResolvedValueOnce({ data: { exports_count: 100 }, error: null }); // usage

    vi.resetModules();
    const { GET } = await import('@/app/api/usage/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(-1); // -1 represents unlimited
    expect(data.remaining).toBe(-1);
    expect(data.is_pro).toBe(true);
  });

  it('should return zero exports for new user', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock no subscription and no usage record
    mockSupabaseSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // no subscription
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // no usage

    vi.resetModules();
    const { GET } = await import('@/app/api/usage/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exports_count).toBe(0);
    expect(data.remaining).toBe(FREE_EXPORT_LIMIT);
  });
});

describe('Usage API - POST /api/usage/increment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const { POST } = await import('@/app/api/usage/increment/route');
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should increment usage for free user under limit', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const currentCount = 2;

    // Mock subscription and current usage
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockFreeSubscription,
      error: null,
    });
    mockSupabaseSingle.mockResolvedValueOnce({
      data: { exports_count: currentCount },
      error: null,
    });

    // Mock upsert response
    mockSupabaseUpsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { exports_count: currentCount + 1, last_export_at: new Date().toISOString() },
        error: null,
      }),
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.exports_count).toBe(currentCount + 1);
    expect(data.can_export).toBe(true);
    expect(data.limit_reached).toBe(false);
  });

  it('should reject increment when free user at limit', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock subscription and usage at limit
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockFreeSubscription,
      error: null,
    });
    mockSupabaseSingle.mockResolvedValueOnce({
      data: { exports_count: FREE_EXPORT_LIMIT },
      error: null,
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Export limit reached');
    expect(data.limit_reached).toBe(true);
    expect(data.can_export).toBe(false);
  });

  it('should always allow increment for pro user', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockProUser },
      error: null,
    });

    // Mock pro subscription and high usage
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockProSubscription,
      error: null,
    });
    mockSupabaseSingle.mockResolvedValueOnce({
      data: { exports_count: 1000 },
      error: null,
    });

    // Mock upsert response
    mockSupabaseUpsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { exports_count: 1001, last_export_at: new Date().toISOString() },
        error: null,
      }),
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.remaining).toBe(-1); // unlimited
  });

  it('should mark limit_reached when hitting the limit', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock subscription and usage at limit - 1
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockFreeSubscription,
      error: null,
    });
    mockSupabaseSingle.mockResolvedValueOnce({
      data: { exports_count: FREE_EXPORT_LIMIT - 1 },
      error: null,
    });

    // Mock upsert response - now at limit
    mockSupabaseUpsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { exports_count: FREE_EXPORT_LIMIT, last_export_at: new Date().toISOString() },
        error: null,
      }),
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.limit_reached).toBe(true);
    expect(data.remaining).toBe(0);
    expect(data.can_export).toBe(false);
  });

  it('should create usage record for first export', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock subscription and no existing usage
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockFreeSubscription,
      error: null,
    });
    mockSupabaseSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    // Mock upsert creating new record
    mockSupabaseUpsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { exports_count: 1, last_export_at: new Date().toISOString() },
        error: null,
      }),
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.exports_count).toBe(1);
    expect(data.remaining).toBe(FREE_EXPORT_LIMIT - 1);
  });
});

describe('Usage API - Billing Period', () => {
  it('should use UTC-based billing period', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock subscription and usage
    mockSupabaseSingle
      .mockResolvedValueOnce({ data: mockFreeSubscription, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

    vi.resetModules();
    const { GET } = await import('@/app/api/usage/route');
    const response = await GET();
    const data = await response.json();

    // period_start should be in YYYY-MM-01 format
    expect(data.period_start).toMatch(/^\d{4}-\d{2}-01$/);

    // It should match the current UTC month
    const expectedMonth = new Date().toISOString().slice(0, 7);
    expect(data.period_start).toBe(`${expectedMonth}-01`);
  });
});
