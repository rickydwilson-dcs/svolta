'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, showValue = false, valueFormatter, min = 0, max = 100, value, defaultValue, id, ...props }, ref) => {
    const generatedId = React.useId();
    const sliderId = id || generatedId;
    const [internalValue, setInternalValue] = React.useState<number>(
      (value as number) ?? (defaultValue as number) ?? Number(min)
    );

    const displayValue = value !== undefined ? (value as number) : internalValue;
    const percentage = ((displayValue - Number(min)) / (Number(max) - Number(min))) * 100;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setInternalValue(newValue);
      props.onChange?.(e);
    };

    const formattedValue = valueFormatter
      ? valueFormatter(displayValue)
      : displayValue.toString();

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          {label && (
            <label
              htmlFor={sliderId}
              className="text-sm font-medium text-[var(--text-primary)]"
            >
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {formattedValue}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            id={sliderId}
            ref={ref}
            type="range"
            min={min}
            max={max}
            value={displayValue}
            defaultValue={defaultValue}
            onChange={handleChange}
            className={cn(
              'w-full h-2 rounded-full appearance-none cursor-pointer',
              'bg-[var(--gray-200)] dark:bg-[var(--gray-700)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2',
              'transition-all duration-200',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-5',
              '[&::-webkit-slider-thumb]:h-5',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-white',
              '[&::-webkit-slider-thumb]:shadow-md',
              '[&::-webkit-slider-thumb]:border-2',
              '[&::-webkit-slider-thumb]:border-[var(--brand-primary)]',
              '[&::-webkit-slider-thumb]:cursor-pointer',
              '[&::-webkit-slider-thumb]:transition-all',
              '[&::-webkit-slider-thumb]:duration-200',
              '[&::-webkit-slider-thumb]:hover:scale-110',
              '[&::-webkit-slider-thumb]:active:scale-95',
              '[&::-moz-range-thumb]:w-5',
              '[&::-moz-range-thumb]:h-5',
              '[&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:bg-white',
              '[&::-moz-range-thumb]:shadow-md',
              '[&::-moz-range-thumb]:border-2',
              '[&::-moz-range-thumb]:border-[var(--brand-primary)]',
              '[&::-moz-range-thumb]:cursor-pointer',
              '[&::-moz-range-thumb]:transition-all',
              '[&::-moz-range-thumb]:duration-200',
              '[&::-moz-range-thumb]:hover:scale-110',
              '[&::-moz-range-thumb]:active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            style={{
              transitionTimingFunction: 'var(--ease-apple)',
              background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${percentage}%, var(--gray-200) ${percentage}%, var(--gray-200) 100%)`,
            }}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
