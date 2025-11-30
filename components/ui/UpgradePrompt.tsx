'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import Link from 'next/link';

export interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: 'limit' | 'watermark' | 'format' | 'logo';
}

const triggerMessages: Record<UpgradePromptProps['trigger'], string> = {
  limit: "You've used all 5 free exports this month",
  watermark: 'Remove the PoseProof watermark',
  format: 'Unlock all export formats',
  logo: 'Add your own logo to exports',
};

const proFeatures = [
  'Unlimited exports',
  'No watermark',
  'Your logo on exports',
  'All export formats',
];

export function UpgradePrompt({ isOpen, onClose, trigger }: UpgradePromptProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
            'bg-[var(--surface-primary)] rounded-3xl shadow-[var(--shadow-lg)]',
            'p-8 md:p-10',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-200',
            'mx-4'
          )}
          style={{
            transitionTimingFunction: 'var(--ease-apple)',
          }}
        >
          {/* Close Button */}
          <Dialog.Close
            className={cn(
              'absolute right-4 top-4 rounded-lg p-2',
              'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--gray-100)] dark:hover:bg-[var(--gray-800)]',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2'
            )}
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Dialog.Close>

          {/* Content */}
          <div className="flex flex-col items-center text-center">
            {/* Emoji Icon */}
            <div className="mb-4 text-5xl" role="img" aria-label="Rocket">
              🚀
            </div>

            {/* Headline */}
            <Dialog.Title className="mb-3 text-2xl font-bold text-[var(--text-primary)]">
              Upgrade to Pro
            </Dialog.Title>

            {/* Dynamic Message */}
            <Dialog.Description className="mb-8 text-base text-[var(--text-secondary)]">
              {triggerMessages[trigger]}
            </Dialog.Description>

            {/* Feature Checklist */}
            <div className="mb-8 w-full">
              <ul className="space-y-3 text-left">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    {/* Green Checkmark */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 flex-shrink-0 text-[var(--success)]"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-base text-[var(--text-primary)]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <Link href="/upgrade" className="w-full" onClick={onClose}>
              <Button
                variant="primary"
                size="lg"
                className="w-full text-lg font-semibold"
              >
                Upgrade Now — £9.99/mo
              </Button>
            </Link>

            {/* Annual Pricing */}
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              or{' '}
              <Link
                href="/upgrade"
                className="font-medium text-[var(--brand-primary)] hover:underline"
                onClick={onClose}
              >
                £79/year
              </Link>{' '}
              (save 34%)
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
