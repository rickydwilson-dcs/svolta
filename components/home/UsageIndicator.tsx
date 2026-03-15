'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUsageLimit } from '@/hooks/useUsageLimit';

export function UsageIndicator() {
  const { used, limit, remaining, canExport, isLoading } = useUsageLimit();

  if (isLoading) return null;

  const percentage = Math.min((used / limit) * 100, 100);
  const isExhausted = !canExport;

  return (
    <section className="py-8 px-4 sm:px-6 bg-surface w-full">
      <div className="max-w-xl mx-auto">
        <div className="card-base p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-text-secondary">This month</p>
            {isExhausted && (
              <Link href="/upgrade" className="text-sm font-medium text-brand-pink hover:text-brand-purple transition-colors">
                Upgrade
              </Link>
            )}
          </div>
          <p className="text-lg font-semibold mb-3">
            {used} of {limit} exports used
            {remaining > 0 && (
              <span className="text-sm font-normal text-text-secondary ml-2">
                ({remaining} remaining)
              </span>
            )}
          </p>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                isExhausted
                  ? 'bg-gradient-to-r from-red-400 to-red-500'
                  : 'bg-gradient-to-r from-brand-pink to-brand-purple'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
