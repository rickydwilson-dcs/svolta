'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface SignupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignupPromptModal({ isOpen, onClose }: SignupPromptModalProps) {
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
            'fixed left-[50%] top-[50%] z-50 w-full max-w-[512px] translate-x-[-50%] translate-y-[-50%]',
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
        >
          {/* Close Button */}
          <Dialog.Close
            className={cn(
              'absolute right-4 top-4 rounded-lg p-2',
              'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--gray-100)] dark:hover:bg-[var(--gray-800)]',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-pink)] focus-visible:ring-offset-2'
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
            {/* Icon */}
            <div className="mb-4 text-5xl" role="img" aria-label="Sparkles">
              ✨
            </div>

            {/* Headline */}
            <Dialog.Title className="mb-3 text-2xl font-bold text-[var(--text-primary)]">
              You&apos;ve used your free exports
            </Dialog.Title>

            {/* Message */}
            <Dialog.Description className="mb-8 text-base text-[var(--text-secondary)]">
              Create a free account to get 5 more exports, or upgrade to Pro for unlimited exports.
            </Dialog.Description>

            {/* CTA Buttons */}
            <a
              href="/signup"
              className={cn(
                'w-full py-3.5 rounded-xl font-semibold text-white text-center',
                'bg-instagram-gradient hover:opacity-90 transition-opacity'
              )}
              onClick={onClose}
            >
              Create Free Account
            </a>

            <a
              href="/upgrade"
              className={cn(
                'w-full mt-3 py-3.5 rounded-xl font-semibold text-center',
                'border border-[var(--border-default)] text-[var(--text-primary)]',
                'hover:bg-[var(--gray-50)] transition-colors'
              )}
              onClick={onClose}
            >
              Upgrade to Pro — Unlimited
            </a>

            <a
              href="/login"
              className="mt-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              onClick={onClose}
            >
              Already have an account? Sign in
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
