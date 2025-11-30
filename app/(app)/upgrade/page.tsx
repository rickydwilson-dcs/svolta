'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PLANS, formatPrice, calculateYearlySavings } from '@/lib/stripe/plans';
import { useUserStore } from '@/stores/user-store';

export default function UpgradePage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isPro = useUserStore((state) => state.isPro);
  const profile = useUserStore((state) => state.profile);

  const currentPlan = isPro() ? 'pro' : 'free';
  const yearlySavings = calculateYearlySavings(PLANS.pro.price, PLANS.pro.priceYearly!);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;

    if (planId === 'team') {
      // Open contact form or email
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
    <div className="min-h-screen bg-[var(--surface-secondary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-4">
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Editor
          </Link>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
            Choose your plan
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Unlock unlimited exports and remove watermarks to create professional before/after comparisons.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 bg-[var(--surface-primary)] rounded-xl border border-[var(--border-default)]">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                billingPeriod === 'monthly'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                billingPeriod === 'yearly'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Annual
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                billingPeriod === 'yearly'
                  ? 'bg-white/20 text-white'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                Save {yearlySavings}%
              </span>
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-8 p-4 rounded-xl text-center ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
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
              <Card
                key={plan.id}
                className={`relative flex flex-col p-8 ${
                  isHighlighted
                    ? 'ring-2 ring-[var(--brand-primary)] scale-[1.02]'
                    : ''
                }`}
              >
                {/* Popular Badge */}
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-primary)] text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--gray-200)] text-[var(--text-secondary)] dark:bg-[var(--gray-700)]">
                      Current
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[var(--text-primary)]">
                      {plan.price === 0 ? 'Free' : formatPrice(price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-[var(--text-secondary)]">/mo</span>
                    )}
                  </div>
                  {billingPeriod === 'yearly' && plan.priceYearly && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {formatPrice(totalPrice)} billed annually
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 mt-0.5 text-green-500"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {feature}
                      </span>
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
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Have questions?{' '}
            <a
              href="mailto:hello@poseproof.com"
              className="text-[var(--brand-primary)] hover:underline"
            >
              Contact us
            </a>{' '}
            or check out our{' '}
            <Link href="/faq" className="text-[var(--brand-primary)] hover:underline">
              FAQ
            </Link>
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure checkout
          </div>
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Photos never leave your device
          </div>
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Cancel anytime
          </div>
        </div>
      </div>
    </div>
  );
}
