import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FREE_EXPORT_LIMIT } from '@/lib/stripe/plans';
import { getCurrentBillingPeriod } from '@/lib/utils/billing-period';

/**
 * POST /api/usage/increment
 *
 * Increments the export count for the current month.
 * Returns updated usage information.
 *
 * For Free users: Checks if limit is reached before incrementing.
 * For Pro users: Always allows increment (unlimited).
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
export async function POST() {
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

    // Fetch user's subscription to determine limit
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .single();

    const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';

    // Fetch current month's usage
    const { data: currentUsage } = await supabase
      .from('usage')
      .select('exports_count')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single();

    const currentCount = currentUsage?.exports_count ?? 0;

    // For Free users, check if limit is reached
    if (!isPro && currentCount >= FREE_EXPORT_LIMIT) {
      return NextResponse.json(
        {
          error: 'Export limit reached',
          message: `You've reached your limit of ${FREE_EXPORT_LIMIT} exports per month. Upgrade to Pro for unlimited exports.`,
          exports_count: currentCount,
          remaining: 0,
          can_export: false,
          limit_reached: true,
        },
        { status: 403 }
      );
    }

    // Upsert usage record (increment or create)
    const { data: updatedUsage, error: upsertError } = await supabase
      .from('usage')
      .upsert(
        {
          user_id: user.id,
          month: currentMonth,
          exports_count: currentCount + 1,
          last_export_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,month',
        }
      )
      .select('exports_count, last_export_at')
      .single();

    if (upsertError) {
      console.error('Error upserting usage:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update usage data' },
        { status: 500 }
      );
    }

    const newCount = updatedUsage.exports_count;
    const remaining = isPro ? -1 : Math.max(0, FREE_EXPORT_LIMIT - newCount);
    const canExport = isPro || newCount < FREE_EXPORT_LIMIT;
    const limitReached = !isPro && newCount >= FREE_EXPORT_LIMIT;

    return NextResponse.json({
      success: true,
      exports_count: newCount,
      remaining,
      can_export: canExport,
      limit_reached: limitReached,
    });

  } catch (error) {
    console.error('Usage increment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
