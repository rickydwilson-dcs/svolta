import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, children, ...props }, ref) => {
    // Instagram-style pill buttons with gradient
    const baseStyles =
      'relative inline-flex flex-row items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 overflow-hidden';

    const variantStyles = {
      // Gradient pill button - Instagram style
      primary:
        'bg-instagram-gradient text-white rounded-full shadow-soft hover:shadow-glow active:scale-[0.98]',
      // Gray background button
      secondary:
        'bg-gray-100 text-text rounded-full hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700',
      // Transparent with hover
      ghost:
        'bg-transparent text-text rounded-full hover:bg-gray-100 active:scale-[0.98] dark:hover:bg-gray-800',
      // Bordered button
      outline:
        'bg-transparent text-text rounded-full border border-border hover:bg-gray-50 active:scale-[0.98] dark:hover:bg-gray-900',
    };

    const sizeStyles = {
      sm: 'h-9 px-4 text-sm gap-1.5',
      md: 'h-12 px-6 text-base gap-2',
      lg: 'h-14 px-8 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          'group',
          className
        )}
        {...props}
      >
        {/* Hover shine effect for primary */}
        {variant === 'primary' && (
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
        )}

        {loading && (
          <svg
            aria-hidden="true"
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
        <span className="relative flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
