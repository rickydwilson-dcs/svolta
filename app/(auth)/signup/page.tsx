'use client';

import Link from 'next/link';
import { OAuthButtons } from '@/components/ui/OAuthButtons';
import { MagicLinkForm } from '@/components/ui/MagicLinkForm';

export default function SignupPage() {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text mb-1">
          Create your account
        </h1>
        <p className="text-sm text-text-secondary">
          Get started with svolta today
        </p>
      </div>

      {/* OAuth Buttons */}
      <OAuthButtons redirectTo="/editor" />

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
      <MagicLinkForm redirectTo="/editor" />

      {/* Terms */}
      <p className="mt-6 text-xs text-text-tertiary text-center">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-text-secondary transition-colors">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-text-secondary transition-colors">
          Privacy Policy
        </Link>
      </p>

      {/* Login Link */}
      <p className="mt-4 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-brand-pink hover:text-brand-pink/80 transition-colors"
        >
          Sign in
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
