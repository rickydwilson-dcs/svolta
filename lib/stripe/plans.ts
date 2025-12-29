export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  priceYearly?: number;
  exportsPerMonth: number;
  stripePriceId?: string;
  stripePriceIdYearly?: string;
  features: string[];
  highlighted?: boolean;
}

/**
 * Pricing Plans Configuration
 *
 * To set up in Stripe:
 * 1. Create a "Pro" product in Stripe Dashboard
 * 2. Add monthly price (£7.99/month recurring)
 * 3. Add yearly price (£79/year recurring)
 * 4. Copy the price IDs (price_xxx) and update below
 * 5. Same for Team plan if needed
 *
 * Environment variables needed:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Publishable key (if using client-side)
 * - NEXT_PUBLIC_APP_URL: Your app URL for redirects
 */
export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out svolta',
    price: 0,
    exportsPerMonth: 5,
    features: [
      '5 exports per month',
      'svolta watermark',
      'Square (1:1) format only',
      'Basic pose detection',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For serious fitness coaches',
    price: 7.99,
    priceYearly: 79,
    exportsPerMonth: Infinity,
    // Replace these with your actual Stripe price IDs
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
    features: [
      'Unlimited exports',
      'No watermark',
      'Your custom logo',
      'All formats (1:1, 4:5, 9:16)',
      'Priority support',
    ],
    highlighted: true,
  },
  team: {
    id: 'team',
    name: 'Team',
    description: 'For fitness studios and teams',
    price: 29.99,
    priceYearly: 249,
    exportsPerMonth: Infinity,
    // Replace these with your actual Stripe price IDs
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_team_monthly',
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID || 'price_team_yearly',
    features: [
      'Everything in Pro',
      '5 team seats',
      'Shared brand assets',
      'Team analytics',
      'Dedicated support',
    ],
  },
};

export const FREE_EXPORT_LIMIT = 5;

export function getPlanByTier(tier: 'free' | 'pro' | 'team'): Plan {
  return PLANS[tier] || PLANS.free;
}

export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  const yearlyFromMonthly = monthlyPrice * 12;
  const savings = yearlyFromMonthly - yearlyPrice;
  return Math.round((savings / yearlyFromMonthly) * 100);
}

export function formatPrice(price: number, currency: string = 'GBP'): string {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(price);
}

/**
 * Get the price ID for a plan based on billing period
 */
export function getPriceId(planId: string, billingPeriod: 'monthly' | 'yearly'): string | null {
  const plan = PLANS[planId];
  if (!plan) return null;

  return billingPeriod === 'yearly' ? plan.stripePriceIdYearly || null : plan.stripePriceId || null;
}
