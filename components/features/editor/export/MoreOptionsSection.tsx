'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MoreOptionsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function MoreOptionsSection({ isExpanded, onToggle, children }: MoreOptionsSectionProps) {
  return (
    <div className="border-t border-[var(--border-default)]">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <span>More options</span>
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
          className={cn(
            'transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
