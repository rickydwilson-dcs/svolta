'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SvoltaLogo } from '@/components/ui/SvoltaLogo';

export function MarketingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 safe-top transition-all duration-300',
        isScrolled
          ? 'header-scrolled'
          : 'header-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <SvoltaLogo size={40} mode="dark" showWordmark wordmarkStyle="gradient" />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              isScrolled
                ? 'text-white/80 hover:text-white'
                : 'text-white/70 hover:text-white'
            )}
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
  );
}
