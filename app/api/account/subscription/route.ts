import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripeLogger } from '@/lib/logger';
import { withRateLimit } from '@/lib/middleware/rate-limit';

export async function GET(request: Request) {
  return withRateLimit<
    | { error: string }
    | { subscription: unknown; isPro: boolean }
  >(request, 'default', async () => {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch subscription for authenticated user (uses session-scoped client with RLS)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      stripeLogger.error('Error fetching subscription:', subError);
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }

    return NextResponse.json({
      subscription: subscription || null,
      isPro: subscription?.tier === 'pro' && subscription?.status === 'active',
    });
  } catch (error) {
    stripeLogger.error('Subscription API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}
