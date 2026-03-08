import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { validateRequest, CreatePortalSchema } from '@/lib/validation/api-schemas';

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session for managing subscriptions.
 *
 * Rate limited: 10 requests per minute
 */
export async function POST(request: Request) {
  return withRateLimit<{ error: string } | { url: string }>(
    request,
    'stripe-portal',
    async () => {
    // Validate request body
    const validation = await validateRequest(request, CreatePortalSchema);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    try {
      // Verify user is authenticated
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Get the app URL for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create billing portal session
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

      return NextResponse.json({ url: portalSession.url });

    } catch (error) {
      console.error('Portal error:', error);

      if (error instanceof Error) {
        return NextResponse.json(
          { error: 'Failed to create billing portal session' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create billing portal session' },
        { status: 500 }
      );
    }
  });
}
