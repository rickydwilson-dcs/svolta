import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variantStyles = {
      primary:
        'bg-[var(--brand-primary)] text-white shadow-md hover:bg-[var(--brand-primary)] hover:shadow-lg hover:scale-[1.02] focus-visible:ring-[var(--brand-primary)] active:scale-[0.98]',
      secondary:
        'bg-[var(--gray-200)] text-[var(--text-primary)] hover:bg-[var(--gray-300)] hover:scale-[1.02] active:scale-[0.98] dark:bg-[var(--gray-700)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--gray-600)]',
      ghost:
        'text-[var(--text-primary)] hover:bg-[var(--gray-100)] hover:text-[var(--text-primary)] dark:hover:bg-[var(--gray-800)]',
    };

    const sizeStyles = {
      sm: 'h-9 px-4 text-sm gap-1.5',
      md: 'h-11 px-6 text-base gap-2',
      lg: 'h-14 px-8 text-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        style={{
          transitionTimingFunction: 'var(--ease-apple)',
        }}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
