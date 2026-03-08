'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { OAuthButtons } from '@/components/ui/OAuthButtons';
import { MagicLinkForm } from '@/components/ui/MagicLinkForm';

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/editor';
  const errorParam = searchParams.get('error');

  const error = errorParam ? decodeURIComponent(errorParam) : null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-text-secondary">
          Sign in to your account to continue
        </p>
      </div>

      {/* Error Message from callback */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-sm text-error">
          {error}
        </div>
      )}

      {/* OAuth Buttons */}
      <OAuthButtons redirectTo={redirectTo} />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface px-3 text-text-tertiary">
            or continue with email
          </span>
        </div>
      </div>

      {/* Magic Link Form */}
      <MagicLinkForm redirectTo={redirectTo} />

      {/* Signup Link */}
      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-semibold text-brand-pink hover:text-brand-pink/80 transition-colors"
        >
          Sign up
        </Link>
      </p>

      {/* Privacy Footer */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs text-text-tertiary text-center">
          Your photos are processed locally and never uploaded to our servers.
        </p>
      </div>
    </div>
  );
}
