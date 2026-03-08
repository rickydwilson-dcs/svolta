'use client';

import * as React from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';

export interface SegmentedControlOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
  ariaLabel?: string;
}

const SegmentedControl = ({
  options,
  value,
  defaultValue,
  onValueChange,
  size = 'md',
  fullWidth = true,
  className,
  ariaLabel,
}: SegmentedControlProps) => {
  const sizeStyles = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
  };

  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      defaultValue={defaultValue}
      onValueChange={(newValue) => {
        if (newValue) onValueChange?.(newValue);
      }}
      aria-label={ariaLabel}
      className={cn(
        'flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl',
        fullWidth && 'w-full',
        className
      )}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            // Base styles
            'flex-1 flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-out',
            // Size
            sizeStyles[size],
            // Default state
            'text-text-secondary hover:text-text',
            // Active state - white background with shadow
            'data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-sm',
            'data-[state=on]:border data-[state=on]:border-black/5 dark:data-[state=on]:border-white/5',
            // Disabled
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
};

SegmentedControl.displayName = 'SegmentedControl';

export { SegmentedControl };
