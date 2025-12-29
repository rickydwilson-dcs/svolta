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
        isScrolled ? 'header-scrolled' : 'header-gradient'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo - mono (white) on gradient, dark mode on scrolled */}
        <Link href="/" className="flex items-center">
          <SvoltaLogo
            size={40}
            mode={isScrolled ? 'dark' : 'mono'}
            showWordmark
            wordmarkStyle={isScrolled ? 'gradient' : 'solid'}
          />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/editor"
            className={cn(
              'h-10 px-5 text-sm font-medium rounded-full transition-all inline-flex items-center justify-center',
              isScrolled
                ? 'btn-pill btn-primary'
                : 'bg-transparent border-2 border-white text-white hover:bg-white/10'
            )}
          >
            Try Free
          </Link>
        </nav>
      </div>
    </header>
  );
}
