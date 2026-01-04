'use client';

import * as React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Useful for isolating errors in canvas, media processing, or complex UI components.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *   <CanvasComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   return (
 *     <ErrorBoundaryWrapper fallback={<p>Error</p>}>
 *       <RiskyComponent />
 *     </ErrorBoundaryWrapper>
 *   );
 * }
 * ```
 */
export function ErrorBoundaryWrapper({
  children,
  fallback,
  onError,
}: ErrorBoundaryProps): React.JSX.Element {
  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Async error boundary for handling async component errors
 * Use with Suspense for async data loading
 */
export function AsyncErrorBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-500">Failed to load content</p>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}
