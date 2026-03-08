'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ExportType } from '@/lib/export-utils';

interface ExportTypeToggleProps {
  exportType: ExportType;
  isPro: boolean;
  onChange: (type: string) => void;
}

export function ExportTypeToggle({ exportType, isPro, onChange }: ExportTypeToggleProps) {
  return (
    <div className="px-4 pb-4">
      <div className="flex p-1 bg-[var(--gray-100)] dark:bg-[var(--gray-800)] rounded-xl">
        <button
          onClick={() => onChange('png')}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200',
            exportType === 'png'
              ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          Image
        </button>
        <button
          onClick={() => onChange('gif')}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200',
            exportType === 'gif'
              ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            !isPro && 'opacity-50'
          )}
        >
          Animation
          {!isPro && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-pink)]/10 text-[var(--brand-pink)]">
              PRO
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
