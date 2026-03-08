'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

export interface BottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const BottomSheet = ({
  open,
  onOpenChange,
  children,
  title,
  description,
}: BottomSheetProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-40',
            'bg-black/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Sheet */}
        <Dialog.Content
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'w-full max-h-[85vh]',
            // Glassmorphism background
            'bg-white/90 dark:bg-[#121212]/90',
            'backdrop-blur-xl',
            // Shape
            'rounded-t-[24px]',
            // Shadow
            'shadow-[0_-8px_30px_rgba(0,0,0,0.12)]',
            // Border
            'border-t border-white/20 dark:border-white/5',
            // Animation
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'duration-300 ease-out'
          )}
        >
          {/* Drag Handle */}
          <div className="w-full flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Header */}
          <div className="px-6 pb-4 text-center">
            <Dialog.Title className={cn(!title && 'sr-only', title && 'text-lg font-semibold tracking-tight text-text dark:text-white')}>
              {title || 'Dialog'}
            </Dialog.Title>
            <Dialog.Description className={cn(!description && 'sr-only', description && 'text-sm text-text-secondary mt-1')}>
              {description || 'Dialog content'}
            </Dialog.Description>
          </div>

          {/* Content */}
          <div className="px-6 pb-10 overflow-y-auto">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

BottomSheet.displayName = 'BottomSheet';

export { BottomSheet };
