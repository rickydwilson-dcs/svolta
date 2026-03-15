'use client';

import Link from 'next/link';
import { PLANS } from '@/lib/stripe/plans';

interface UpgradeNudgeProps {
  urgent?: boolean; // true when exports are exhausted
}

export function UpgradeNudge({ urgent = false }: UpgradeNudgeProps) {
  const proFeatures = PLANS.pro.features;

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 bg-surface w-full">
      <div className="mx-auto text-center" style={{ maxWidth: '36rem' }}>
        {urgent ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-3">
              You&apos;ve hit your limit
            </h2>
            <p className="text-text-secondary mb-8">
              Unlock unlimited exports and remove watermarks for £7.99/month.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-3">
              Get more from svolta
            </h2>
            <p className="text-text-secondary mb-8">
              Upgrade to Pro for the full experience.
            </p>
          </>
        )}

        <div className="card-base p-6 text-left mb-6 bg-gradient-to-br from-brand-pink/5 to-brand-purple/5">
          <ul className="space-y-3">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <svg className="w-5 h-5 text-brand-pink flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-text min-w-0">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link href="/upgrade" className="btn-pill btn-primary w-full sm:w-auto px-8">
          Upgrade to Pro — £7.99/mo
        </Link>
        <p className="mt-3 text-sm text-text-tertiary">
          or <Link href="/upgrade" className="text-brand-pink hover:underline">£79/year (save 18%)</Link>
        </p>
      </div>
    </section>
  );
}
