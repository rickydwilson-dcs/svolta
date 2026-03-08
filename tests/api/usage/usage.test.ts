/**
 * Usage API Tests
 *
 * Tests for /api/usage and /api/usage/increment endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
const mockSupabaseInsert = vi.fn().mockReturnThis();
const mockSupabaseRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
      upsert: mockSupabaseUpsert,
      insert: mockSupabaseInsert,
    }),
    rpc: mockSupabaseRpc,
  })),
}));

// Mock withRateLimit to bypass rate limiting — just call the handler
vi.mock('@/lib/middleware/rate-limit', () => ({
  withRateLimit: vi.fn((_request: Request, _endpoint: string, handler: () => Promise<Response>) => handler()),
  RATE_LIMIT_CONFIGS: {},
}));

// Mock validateRequest to always succeed
vi.mock('@/lib/validation/api-schemas', () => ({
  validateRequest: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  IncrementUsageSchema: {},
}));

// Mock audit logger
vi.mock('@/lib/audit/logger', () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
  logAuditEvents: vi.fn(() => Promise.resolve()),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  usageLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock billing period to return a consistent value
vi.mock('@/lib/utils/billing-period', () => ({
  getCurrentBillingPeriod: vi.fn(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }),
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
    const request = new Request('http://localhost:3000/api/usage');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return usage data for free user', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock subscription check then usage check
    mockSupabaseSingle
      .mockResolvedValueOnce({ data: mockFreeSubscription, error: null }) // subscription
      .mockResolvedValueOnce({ data: mockUsage, error: null }); // usage

    vi.resetModules();
    const { GET } = await import('@/app/api/usage/route');
    const request = new Request('http://localhost:3000/api/usage');
    const response = await GET(request);
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
    const request = new Request('http://localhost:3000/api/usage');
    const response = await GET(request);
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
    const request = new Request('http://localhost:3000/api/usage');
    const response = await GET(request);
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
    const request = new Request('http://localhost:3000/api/usage/increment', { method: 'POST' });
    const response = await POST(request);
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

    // Mock subscription query
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockFreeSubscription,
      error: null,
    });

    // Mock RPC increment_export_count
    mockSupabaseRpc.mockResolvedValueOnce({
      data: { exports_count: currentCount + 1, remaining: FREE_EXPORT_LIMIT - (currentCount + 1), limit_reached: false },
      error: null,
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const request = new Request('http://localhost:3000/api/usage/increment', { method: 'POST' });
    const response = await POST(request);
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

    // Mock subscription
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockFreeSubscription,
      error: null,
    });

    // Mock RPC - user was already at limit, so post-increment count exceeds limit
    mockSupabaseRpc.mockResolvedValueOnce({
      data: { exports_count: FREE_EXPORT_LIMIT + 1, remaining: 0, limit_reached: true },
      error: null,
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const request = new Request('http://localhost:3000/api/usage/increment', { method: 'POST' });
    const response = await POST(request);
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

    // Mock pro subscription
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockProSubscription,
      error: null,
    });

    // Mock RPC for pro user
    mockSupabaseRpc.mockResolvedValueOnce({
      data: { exports_count: 1001, remaining: -1, limit_reached: false },
      error: null,
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const request = new Request('http://localhost:3000/api/usage/increment', { method: 'POST' });
    const response = await POST(request);
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

    // Mock subscription
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockFreeSubscription,
      error: null,
    });

    // Mock RPC - exactly at limit (not over), so it's allowed but limit_reached is true
    mockSupabaseRpc.mockResolvedValueOnce({
      data: { exports_count: FREE_EXPORT_LIMIT, remaining: 0, limit_reached: true },
      error: null,
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const request = new Request('http://localhost:3000/api/usage/increment', { method: 'POST' });
    const response = await POST(request);
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

    // Mock subscription
    mockSupabaseSingle.mockResolvedValueOnce({
      data: mockFreeSubscription,
      error: null,
    });

    // Mock RPC - first export
    mockSupabaseRpc.mockResolvedValueOnce({
      data: { exports_count: 1, remaining: FREE_EXPORT_LIMIT - 1, limit_reached: false },
      error: null,
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/usage/increment/route');
    const request = new Request('http://localhost:3000/api/usage/increment', { method: 'POST' });
    const response = await POST(request);
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
    const request = new Request('http://localhost:3000/api/usage');
    const response = await GET(request);
    const data = await response.json();

    // period_start should be in YYYY-MM-01 format
    expect(data.period_start).toMatch(/^\d{4}-\d{2}-01$/);

    // It should match the current UTC month
    const expectedMonth = new Date().toISOString().slice(0, 7);
    expect(data.period_start).toBe(`${expectedMonth}-01`);
  });
});
