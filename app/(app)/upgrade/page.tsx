'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PLANS, formatPrice, calculateYearlySavings } from '@/lib/stripe/plans';
import { useUserStore } from '@/stores/user-store';

export default function UpgradePage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isPro = useUserStore((state) => state.isPro);

  const currentPlan = isPro() ? 'pro' : 'free';
  const yearlySavings = calculateYearlySavings(PLANS.pro.price, PLANS.pro.priceYearly!);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;

    if (planId === 'team') {
      window.location.href = 'mailto:hello@poseproof.com?subject=Team Plan Inquiry';
      return;
    }

    setIsLoading(planId);
    setMessage(null);

    try {
      const priceId = billingPeriod === 'yearly'
        ? PLANS[planId].stripePriceIdYearly
        : PLANS[planId].stripePriceId;

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, billingPeriod }),
      });

      const data = await response.json();

      if (data.comingSoon) {
        setMessage({
          type: 'success',
          text: 'Payments coming soon! Thanks for your interest in upgrading.',
        });
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start checkout' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(null);
    }
  };

  const plans = Object.values(PLANS);

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Header with gradient glow */}
      <div className="upgrade-header-glow pt-8 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Back Link */}
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors mb-6 sm:mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Editor
          </Link>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text mb-3">
              Unlock your full{' '}
              <span className="text-instagram-gradient">potential</span>
            </h1>
            <p className="text-base sm:text-lg text-text-secondary">
              Remove watermarks and export unlimited professional before/after comparisons.
            </p>
          </div>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center -mt-6 mb-8 sm:mb-10 px-4 sm:px-6">
        <div className="billing-toggle">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={billingPeriod === 'monthly' ? 'active' : ''}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`flex items-center gap-2 ${billingPeriod === 'yearly' ? 'active' : ''}`}
          >
            Yearly
            {billingPeriod !== 'yearly' && (
              <span className="savings-badge">Save {yearlySavings}%</span>
            )}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-5xl mx-auto mb-8 px-4">
          <div className={`p-4 rounded-xl text-center text-sm ${
            message.type === 'success'
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-error/10 text-error border border-error/20'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const isHighlighted = plan.highlighted;
            const price = billingPeriod === 'yearly' && plan.priceYearly
              ? plan.priceYearly / 12
              : plan.price;
            const totalPrice = billingPeriod === 'yearly' && plan.priceYearly
              ? plan.priceYearly
              : plan.price;

            return (
              <div
                key={plan.id}
                className={isHighlighted ? 'pricing-card-pro' : 'pricing-card'}
              >
                {isHighlighted && <div className="badge-popular">Most Popular</div>}

                <div className={isHighlighted ? 'pricing-card-pro-inner' : ''}>
                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <div className="mb-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-text-secondary dark:bg-gray-800">
                        Current Plan
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-5">
                    <h3 className="text-xl font-semibold text-text mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="price-display text-text">
                        {plan.price === 0 ? 'Free' : formatPrice(price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="price-period">/mo</span>
                      )}
                    </div>
                    {billingPeriod === 'yearly' && plan.priceYearly && (
                      <p className="mt-1 text-sm text-text-secondary">
                        {formatPrice(totalPrice)} billed annually
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="feature-list mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index}>
                        <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-text-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    variant={isHighlighted ? 'primary' : 'secondary'}
                    className="w-full"
                    disabled={isCurrentPlan || isLoading === plan.id}
                    loading={isLoading === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrentPlan
                      ? 'Current Plan'
                      : plan.id === 'free'
                      ? 'Downgrade'
                      : plan.id === 'team'
                      ? 'Contact Us'
                      : 'Upgrade Now'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Link */}
        <div className="mt-12 text-center">
          <p className="text-sm text-text-secondary">
            Have questions?{' '}
            <a
              href="mailto:hello@poseproof.com"
              className="font-medium text-brand-pink hover:text-brand-pink/80 transition-colors"
            >
              Contact us
            </a>{' '}
            or check out our{' '}
            <Link
              href="/faq"
              className="font-medium text-brand-pink hover:text-brand-pink/80 transition-colors"
            >
              FAQ
            </Link>
          </p>
        </div>

        {/* Trust Badges */}
        <div className="trust-badges mt-8">
          <div className="trust-badge">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Secure checkout</span>
          </div>
          <div className="trust-badge">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Photos never uploaded</span>
          </div>
          <div className="trust-badge">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Cancel anytime</span>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-surface border border-border">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-text">30-day money-back guarantee</p>
              <p className="text-xs text-text-secondary">Not satisfied? Get a full refund, no questions asked.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
