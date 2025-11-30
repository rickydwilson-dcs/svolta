import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FREE_EXPORT_LIMIT } from '@/lib/stripe/plans';

/**
 * GET /api/usage
 *
 * Returns current month's usage for authenticated user.
 */
export async function GET() {
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

    // Get current month in YYYY-MM format
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Fetch user's subscription to determine limit
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .single();

    const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';
    const limit = isPro ? Infinity : FREE_EXPORT_LIMIT;

    // Fetch current month's usage
    const { data: usage, error: usageError } = await supabase
      .from('usage')
      .select('exports_count, last_export_at')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single();

    // PGRST116 means no rows - user hasn't exported yet this month
    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' },
        { status: 500 }
      );
    }

    const exportsCount = usage?.exports_count ?? 0;
    const remaining = isPro ? Infinity : Math.max(0, FREE_EXPORT_LIMIT - exportsCount);

    return NextResponse.json({
      exports_count: exportsCount,
      period_start: `${currentMonth}-01`,
      limit: isPro ? -1 : FREE_EXPORT_LIMIT, // -1 represents unlimited
      remaining: isPro ? -1 : remaining,
      is_pro: isPro,
      last_export_at: usage?.last_export_at ?? null,
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
