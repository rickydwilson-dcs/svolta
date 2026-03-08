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
      <label
        htmlFor={toggleId}
        className={cn(
          'flex items-center justify-between w-full cursor-pointer group',
          props.disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <div className="flex-1">
          {label && (
            <span className="text-base text-text dark:text-gray-200">
              {label}
            </span>
          )}
          {description && (
            <p className="text-xs text-text-secondary mt-0.5">
              {description}
            </p>
          )}
        </div>

        <div className="relative">
          <input
            id={toggleId}
            ref={ref}
            type="checkbox"
            role="switch"
            checked={currentChecked}
            defaultChecked={defaultChecked}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />

          {/* Track - Instagram gradient when checked */}
          <div
            className={cn(
              'w-11 h-6 rounded-full transition-all duration-300 ease-out',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2',
              currentChecked
                ? 'bg-instagram-gradient'
                : 'bg-gray-200 dark:bg-gray-700'
            )}
          />

          {/* Thumb */}
          <div
            className={cn(
              'absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 shadow-sm transition-all duration-300 ease-out',
              'border border-gray-300 dark:border-gray-600',
              currentChecked && 'translate-x-5 border-white'
            )}
          />
        </div>
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
