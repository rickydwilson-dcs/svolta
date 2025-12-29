import Link from 'next/link';
import { SvoltaLogo } from '@/components/ui/SvoltaLogo';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      {/* Header */}
      <header className="floating-header fixed top-0 left-0 right-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <SvoltaLogo size={32} mode="dark" showWordmark wordmarkStyle="gradient" />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/editor"
              className="btn-pill btn-primary h-10 px-5 text-sm"
            >
              Try Free
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content - full width, pages control their own sections */}
      <main className="flex-1 pt-14">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 bg-surface border-t border-border safe-bottom">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <SvoltaLogo size={24} mode="dark" showWordmark wordmarkStyle="gradient" />

            {/* Links */}
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <Link href="/privacy" className="text-text-secondary hover:text-text transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-text-secondary hover:text-text transition-colors">
                Terms
              </Link>
              <a href="mailto:hello@svolta.app" className="text-text-secondary hover:text-text transition-colors">
                Contact
              </a>
            </nav>

            {/* Copyright */}
            <p className="text-sm text-text-tertiary">
              © {new Date().getFullYear()} svolta
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
