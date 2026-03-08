import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface RateLimitResult {
  success: boolean;
  count: number;
  limit: number;
  remaining: number;
  reset: number;
}

export const RATE_LIMIT_CONFIGS = {
  'usage-increment': { maxRequests: 100, windowSeconds: 60 }, // 100/min
  'backgrounds-upload': { maxRequests: 10, windowSeconds: 900 }, // 10/15min
  'logos-upload': { maxRequests: 10, windowSeconds: 900 }, // 10/15min
  'stripe-checkout': { maxRequests: 5, windowSeconds: 300 }, // 5/5min
  'stripe-portal': { maxRequests: 10, windowSeconds: 60 }, // 10/min
  'account-delete': { maxRequests: 2, windowSeconds: 3600 }, // 2/hour
  'default': { maxRequests: 60, windowSeconds: 60 }, // 60/min
} as const;

export async function withRateLimit<T>(
  request: Request,
  endpoint: keyof typeof RATE_LIMIT_CONFIGS,
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    ) as NextResponse<T>;
  }

  const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default;

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: endpoint,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      logger.error('Rate limit check failed:', error);
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      ) as NextResponse<T>;
    }

    const result = data as RateLimitResult;

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          limit: result.limit,
          remaining: result.remaining,
          reset: new Date(result.reset * 1000).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': Math.ceil((result.reset * 1000 - Date.now()) / 1000).toString(),
          },
        }
      ) as NextResponse<T>;
    }

    const response = await handler();

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());

    return response;
  } catch (error) {
    logger.error('Rate limiting error:', error);
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    ) as NextResponse<T>;
  }
}
