import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { constructWebhookEvent, getStripe } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveTierFromPriceId } from '@/lib/stripe/tier-resolver';
import { webhookLogger } from '@/lib/logger';

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
      webhookLogger.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Security: Reject test events in production
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !event.livemode) {
      webhookLogger.warn('Rejected test event in production:', event.id);
      return NextResponse.json(
        { error: 'Test events rejected in production' },
        { status: 400 }
      );
    }

    // Idempotency: Check if event was already processed
    const supabase = createServiceClient();
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent) {
      webhookLogger.info('Duplicate event skipped:', event.id);
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
        webhookLogger.info('Event already being processed:', event.id);
        return NextResponse.json({ received: true, duplicate: true });
      }
      // Any other error - fail fast, let Stripe retry
      webhookLogger.error('Failed to record webhook event:', insertError);
      return NextResponse.json(
        { error: 'Database error recording webhook event' },
        { status: 500 }
      );
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
        webhookLogger.warn('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    webhookLogger.error('Webhook error:', error);
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
    webhookLogger.error('No user_id in checkout session metadata');
    return;
  }

  // Fetch line items to get the price ID
  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
  const priceId = lineItems.data[0]?.price?.id;
  const tier = resolveTierFromPriceId(priceId);

  webhookLogger.info('Checkout completed', { userId, tier });

  // Upsert subscription record with resolved tier
  const { error } = await createServiceClient()
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      tier,
      status: 'active',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    webhookLogger.error('Error upserting subscription:', error);
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
    const { data: profile } = await createServiceClient()
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single();

    if (!profile) {
      webhookLogger.error('Could not find user for subscription:', subscription.id);
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

  const { error } = await createServiceClient()
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
    webhookLogger.error('Error updating subscription:', error);
  }
}

/**
 * Handle customer.subscription.deleted event
 * Downgrades user to free tier
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile } = await createServiceClient()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    webhookLogger.error('Could not find user for deleted subscription');
    return;
  }

  webhookLogger.info('Subscription deleted', { userId: profile.id });

  // Update subscription to canceled/free
  const { error } = await createServiceClient()
    .from('subscriptions')
    .update({
      tier: 'free',
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.id);

  if (error) {
    webhookLogger.error('Error downgrading subscription:', error);
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

  webhookLogger.warn('Payment failed', { subscriptionId });

  // Find user by customer ID
  const { data: profile } = await createServiceClient()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    webhookLogger.error('Could not find user for failed payment');
    return;
  }

  // Update subscription status
  const { error } = await createServiceClient()
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.id);

  if (error) {
    webhookLogger.error('Error updating subscription status:', error);
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
  const { data: profile } = await createServiceClient()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Ensure subscription is active
  const { error } = await createServiceClient()
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.id);

  if (error) {
    webhookLogger.error('Error updating subscription status:', error);
  }
}
