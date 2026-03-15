'use client';

import Link from 'next/link';
import { useIsStandalone } from '@/lib/hooks/useStandaloneDetect';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { SvoltaLogo } from '@/components/ui/SvoltaLogo';

export function AppHomeOverlay() {
  const isStandalone = useIsStandalone();
  const { used, limit, isPro, isAnonymous } = useUsageLimit();

  if (!isStandalone) return null;

  return (
    <div className="fixed inset-0 z-30 bg-canvas flex flex-col safe-top pb-[var(--tab-bar-height)]">
      {/* Logo header */}
      <div className="flex justify-center px-6 pt-8 pb-4">
        <SvoltaLogo size={48} mode="dark" showWordmark wordmarkStyle="gradient" />
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 px-6 py-8">
        <div className="space-y-6">
          {isPro ? (
            /* Pro user view */
            <div className="flex flex-col items-center text-center gap-6">
              <p className="text-text-secondary">Welcome back</p>

              <Link
                href="/editor"
                className="btn-pill btn-primary w-full flex items-center justify-center gap-2"
              >
                Create New Comparison
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              <p className="text-sm text-text-tertiary">
                Privacy first — photos stay on your device.
              </p>
            </div>
          ) : (
            /* Free / anonymous user view */
            <>
              <Link
                href="/editor"
                className="btn-pill btn-primary w-full flex items-center justify-center gap-2"
              >
                Create New Comparison
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              {/* Usage card */}
              <div className="card-base p-5">
                <p className="text-sm font-medium text-text-secondary mb-2">This month</p>
                <p className="text-lg font-semibold mb-3">
                  {used} of {limit} exports used
                </p>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-brand-pink to-brand-purple"
                    style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Upgrade card */}
              <div className="card-base p-5 bg-gradient-to-br from-brand-pink/5 to-brand-purple/5">
                <p className="font-semibold text-text mb-1">Unlock unlimited exports</p>
                <p className="text-sm text-text-secondary mb-4">
                  Remove watermarks and export in all formats
                </p>
                <Link href="/upgrade" className="btn-pill btn-primary w-full text-center block">
                  Upgrade to Pro
                </Link>
              </div>

              {isAnonymous && (
                <p className="text-center">
                  <Link href="/login" className="text-sm text-brand-pink">
                    Sign in
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
