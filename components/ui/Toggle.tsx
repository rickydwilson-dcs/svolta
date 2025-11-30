'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, checked, defaultChecked, id, ...props }, ref) => {
    const generatedId = React.useId();
    const toggleId = id || generatedId;
    const [isChecked, setIsChecked] = React.useState(checked ?? defaultChecked ?? false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsChecked(e.target.checked);
      props.onChange?.(e);
    };

    const currentChecked = checked !== undefined ? checked : isChecked;

    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          {label && (
            <label
              htmlFor={toggleId}
              className="text-sm font-medium text-[var(--text-primary)] cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {description}
            </p>
          )}
        </div>
        <label
          htmlFor={toggleId}
          className={cn(
            'relative inline-flex h-7 w-12 items-center rounded-full cursor-pointer transition-all duration-300',
            'focus-within:ring-2 focus-within:ring-[var(--border-focus)] focus-within:ring-offset-2',
            currentChecked
              ? 'bg-[var(--brand-primary)]'
              : 'bg-[var(--gray-300)] dark:bg-[var(--gray-600)]',
            props.disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          style={{
            transitionTimingFunction: 'var(--ease-apple)',
          }}
        >
          <input
            id={toggleId}
            ref={ref}
            type="checkbox"
            checked={currentChecked}
            defaultChecked={defaultChecked}
            onChange={handleChange}
            className="sr-only"
            {...props}
          />
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300',
              currentChecked ? 'translate-x-6' : 'translate-x-1'
            )}
            style={{
              transitionTimingFunction: 'var(--ease-apple)',
            }}
          />
        </label>
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
