import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { constructWebhookEvent } from '@/lib/stripe/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resolveTierFromPriceId } from '@/lib/stripe/tier-resolver';

let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Get Supabase admin client (lazy initialization)
 * This prevents build errors when env vars aren't set during static analysis
 */
function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase admin credentials not configured');
    }

    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
}

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature and construct event
    let event: Stripe.Event;
    try {
      event = await constructWebhookEvent(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Security: Reject test events in production
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !event.livemode) {
      console.warn('Rejected test event in production:', event.id);
      return NextResponse.json(
        { error: 'Test events rejected in production' },
        { status: 400 }
      );
    }

    // Idempotency: Check if event was already processed
    const supabase = getSupabaseAdmin();
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent) {
      console.log('Duplicate event skipped:', event.id);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record event before processing to ensure idempotency
    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
      });

    if (insertError) {
      // If insert fails due to unique constraint, another worker got it first
      if (insertError.code === '23505') {
        console.log('Event already being processed by another worker:', event.id);
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error('Failed to record webhook event:', insertError);
    }

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 * Creates or updates subscription record
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!userId) {
    console.error('No user_id in checkout session metadata');
    return;
  }

  console.log('Checkout completed for user:', userId);

  // Upsert subscription record
  const { error } = await getSupabaseAdmin()
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      tier: 'pro',
      status: 'active',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error upserting subscription:', error);
  }
}

/**
 * Handle customer.subscription.updated event
 * Updates subscription status and tier
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    // Try to find user by customer ID
    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single();

    if (!profile) {
      console.error('Could not find user for subscription:', subscription.id);
      return;
    }

    await updateSubscriptionStatus(profile.id, subscription);
    return;
  }

  await updateSubscriptionStatus(userId, subscription);
}

/**
 * Update subscription status in database
 */
async function updateSubscriptionStatus(userId: string, subscription: Stripe.Subscription) {
  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    'active': 'active',
    'trialing': 'active',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'past_due',
    'incomplete': 'incomplete',
    'incomplete_expired': 'canceled',
    'paused': 'paused',
  };

  const status = statusMap[subscription.status] || 'inactive';

  // Determine tier from price using PLANS configuration
  const priceId = subscription.items.data[0]?.price.id;
  const tier = resolveTierFromPriceId(priceId);

  const { error } = await getSupabaseAdmin()
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      tier,
      status,
      current_period_end: (subscription as unknown as { current_period_end?: number }).current_period_end
        ? new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: (subscription as unknown as { cancel_at_period_end?: boolean }).cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

/**
 * Handle customer.subscription.deleted event
 * Downgrades user to free tier
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Could not find user for deleted subscription');
    return;
  }

  console.log('Subscription deleted for user:', profile.id);

  // Update subscription to canceled/free
  const { error } = await getSupabaseAdmin()
    .from('subscriptions')
    .update({
      tier: 'free',
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.id);

  if (error) {
    console.error('Error downgrading subscription:', error);
  }
}

/**
 * Handle invoice.payment_failed event
 * Marks subscription as past_due
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;

  if (!subscriptionId) return;

  console.log('Payment failed for subscription:', subscriptionId);

  // Find user by customer ID
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Could not find user for failed payment');
    return;
  }

  // Update subscription status
  const { error } = await getSupabaseAdmin()
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.id);

  if (error) {
    console.error('Error updating subscription status:', error);
  }
}

/**
 * Handle invoice.payment_succeeded event
 * Ensures subscription is marked active
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;

  if (!subscriptionId) return;

  // Find user by customer ID
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Ensure subscription is active
  const { error } = await getSupabaseAdmin()
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.id);

  if (error) {
    console.error('Error updating subscription status:', error);
  }
}
