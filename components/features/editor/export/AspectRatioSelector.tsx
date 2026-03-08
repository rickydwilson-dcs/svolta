'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AspectRatio } from '@/lib/export-utils';

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}

export function AspectRatioSelector({ value, onChange }: AspectRatioSelectorProps) {
  return (
    <div className="py-3">
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
        Aspect Ratio
      </label>
      <div className="flex p-1 bg-[var(--gray-100)] dark:bg-[var(--gray-800)] rounded-xl">
        {(['4:5', '1:1', '9:16'] as AspectRatio[]).map((ratio) => (
          <button
            key={ratio}
            onClick={() => onChange(ratio)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              value === ratio
                ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {ratio}
          </button>
        ))}
      </div>
    </div>
  );
}
