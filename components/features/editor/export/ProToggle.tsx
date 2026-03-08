'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProToggleProps {
  label: string;
  checked: boolean;
  isPro?: boolean;
  requiresPro?: boolean;
  onToggle: () => void;
}

export function ProToggle({ label, checked, isPro, requiresPro, onToggle }: ProToggleProps) {
  const isDisabled = requiresPro && !isPro;
  const isActive = checked && (!requiresPro || isPro);

  return (
    <div className="flex items-center justify-between py-3 border-t border-[var(--border-default)]">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--text-primary)]">{label}</span>
        {requiresPro && !isPro && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-pink)]/10 text-[var(--brand-pink)]">
            PRO
          </span>
        )}
      </div>
      <button
        onClick={onToggle}
        disabled={isDisabled}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-300',
          isActive ? 'bg-instagram-gradient' : 'bg-[var(--gray-200)] dark:bg-[var(--gray-700)]',
          isDisabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300',
            isActive && 'translate-x-5'
          )}
        />
      </button>
    </div>
  );
}
