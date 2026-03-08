import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FREE_EXPORT_LIMIT } from '@/lib/stripe/plans';
import { getCurrentBillingPeriod } from '@/lib/utils/billing-period';
import { logAuditEvent } from '@/lib/audit/logger';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { validateRequest, IncrementUsageSchema } from '@/lib/validation/api-schemas';
import { usageLogger } from '@/lib/logger';

/**
 * POST /api/usage/increment
 *
 * Increments the export count for the current month.
 * Returns updated usage information.
 *
 * For Free users: Checks if limit is reached before incrementing.
 * For Pro users: Always allows increment (unlimited).
 *
 * Rate limit: 100 requests per minute
 *
 * Response format:
 * {
 *   success: boolean,
 *   exports_count: number,
 *   remaining: number,  // -1 for unlimited
 *   can_export: boolean,
 *   limit_reached: boolean
 * }
 */
export async function POST(request: Request) {
  return withRateLimit<
    | { error: string }
    | {
        success: boolean;
        exports_count: number;
        remaining: number;
        can_export: boolean;
        limit_reached: boolean;
      }
  >(request, 'usage-increment', async () => {
    // Validate request body
    const validation = await validateRequest(request, IncrementUsageSchema);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    try {
      const supabase = await createClient();

      // Verify user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current billing period (UTC-based for consistency)
    const currentMonth = getCurrentBillingPeriod();

    // Fetch user's subscription to determine if Pro
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .single();

    const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';

    // Pro users: always allow, just increment
    if (isPro) {
      // Increment via RPC for consistency
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('increment_export_count', { p_user_id: user.id });

      if (rpcError) {
        usageLogger.error('RPC increment failed for pro user:', rpcError);
        return NextResponse.json(
          { error: 'Failed to update usage data' },
          { status: 500 }
        );
      }

      const result = rpcResult as { exports_count: number; remaining: number; limit_reached: boolean };

      await logAuditEvent(
        user.id,
        {
          action: 'usage.incremented',
          resourceType: 'usage',
          resourceId: currentMonth,
          metadata: {
            exports_count: result.exports_count,
            tier: 'pro',
            limit_reached: false,
          },
        },
        request
      );

      return NextResponse.json({
        success: true,
        exports_count: result.exports_count,
        remaining: -1,
        can_export: true,
        limit_reached: false,
      });
    }

    // Free users: atomic increment with limit check via RPC
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('increment_export_count', { p_user_id: user.id });

    if (rpcError) {
      usageLogger.error('RPC increment failed:', rpcError);
      return NextResponse.json(
        { error: 'Failed to update usage data' },
        { status: 500 }
      );
    }

    const result = rpcResult as { exports_count: number; remaining: number; limit_reached: boolean };

    // If limit was already reached before this call, the RPC still incremented.
    // Check if we need to reject. The RPC returns limit_reached based on post-increment state.
    if (result.limit_reached) {
      // Check if this increment pushed us over (count > limit) vs exactly at limit
      // If count exceeds limit, we were already at the limit before this call
      if (result.exports_count > FREE_EXPORT_LIMIT) {
        return NextResponse.json(
          {
            error: 'Export limit reached',
            message: `You've reached your limit of ${FREE_EXPORT_LIMIT} exports per month. Upgrade to Pro for unlimited exports.`,
            exports_count: result.exports_count,
            remaining: 0,
            can_export: false,
            limit_reached: true,
          },
          { status: 403 }
        );
      }
    }

    const remaining = Math.max(0, FREE_EXPORT_LIMIT - result.exports_count);
    const canExport = result.exports_count < FREE_EXPORT_LIMIT;

    await logAuditEvent(
      user.id,
      {
        action: 'usage.incremented',
        resourceType: 'usage',
        resourceId: currentMonth,
        metadata: {
          exports_count: result.exports_count,
          tier: 'free',
          limit_reached: result.limit_reached,
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      exports_count: result.exports_count,
      remaining,
      can_export: canExport,
      limit_reached: result.limit_reached,
    });

    } catch (error) {
      usageLogger.error('Usage increment API error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
