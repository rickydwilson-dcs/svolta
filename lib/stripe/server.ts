/**
 * Stripe Server Configuration
 * Initializes Stripe SDK with secret key for server-side operations
 * Uses lazy initialization to avoid build-time errors when env vars aren't set
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe client instance (lazy initialization)
 * This prevents build errors when STRIPE_SECRET_KEY is not set during static analysis
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

/**
 * Verify webhook signature and construct event
 */
export async function constructWebhookEvent(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  return getStripe().webhooks.constructEvent(body, signature, webhookSecret);
}
