/**
 * Tier Resolver
 *
 * Resolves subscription tier from Stripe price IDs using the PLANS configuration.
 * This ensures tier detection is consistent and maintainable.
 */

import { PLANS, type Plan } from './plans';

export type SubscriptionTier = 'free' | 'pro' | 'team';

/**
 * Resolve subscription tier from a Stripe price ID
 *
 * @param priceId - The Stripe price ID (e.g., price_xxx)
 * @returns The subscription tier ('free', 'pro', or 'team')
 *
 * @example
 * resolveTierFromPriceId('price_pro_monthly') // Returns 'pro'
 * resolveTierFromPriceId(undefined) // Returns 'free'
 */
export function resolveTierFromPriceId(priceId: string | undefined | null): SubscriptionTier {
  if (!priceId) {
    return 'free';
  }

  // Check each plan's price IDs
  for (const [tierId, plan] of Object.entries(PLANS)) {
    if (tierId === 'free') continue;

    // Check both monthly and yearly price IDs
    if (plan.stripePriceId === priceId || plan.stripePriceIdYearly === priceId) {
      return tierId as SubscriptionTier;
    }
  }

  // Fallback: try to match by tier name in price ID (legacy support)
  const lowerPriceId = priceId.toLowerCase();
  if (lowerPriceId.includes('team')) {
    return 'team';
  }
  if (lowerPriceId.includes('pro')) {
    return 'pro';
  }

  // Default to free if no match found
  return 'free';
}

/**
 * Get plan details from a price ID
 *
 * @param priceId - The Stripe price ID
 * @returns The plan object or null if not found
 */
export function getPlanFromPriceId(priceId: string | undefined | null): Plan | null {
  if (!priceId) {
    return PLANS.free;
  }

  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === priceId || plan.stripePriceIdYearly === priceId) {
      return plan;
    }
  }

  return null;
}

/**
 * Check if a price ID is valid (exists in PLANS)
 *
 * @param priceId - The Stripe price ID to validate
 * @returns true if the price ID is configured in PLANS
 */
export function isValidPriceId(priceId: string | undefined | null): boolean {
  if (!priceId) {
    return false;
  }

  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === priceId || plan.stripePriceIdYearly === priceId) {
      return true;
    }
  }

  return false;
}

/**
 * Get billing interval from price ID
 *
 * @param priceId - The Stripe price ID
 * @returns 'monthly', 'yearly', or null if not found
 */
export function getBillingIntervalFromPriceId(
  priceId: string | undefined | null
): 'monthly' | 'yearly' | null {
  if (!priceId) {
    return null;
  }

  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === priceId) {
      return 'monthly';
    }
    if (plan.stripePriceIdYearly === priceId) {
      return 'yearly';
    }
  }

  return null;
}
