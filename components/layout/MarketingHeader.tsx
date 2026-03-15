'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SvoltaLogo } from '@/components/ui/SvoltaLogo';
import { useUserStore } from '@/stores/user-store';
import { useHeaderSlot } from './HeaderSlotContext';

export function MarketingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const user = useUserStore((s) => s.user);
  const { slot } = useHeaderSlot();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'header-gradient' : 'header-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <SvoltaLogo
            size={44}
            mode={isScrolled ? 'mono' : 'dark'}
            showWordmark
            wordmarkStyle={isScrolled ? 'solid' : 'gradient'}
          />
        </Link>

        {/* Right side: page-injected slot or default nav */}
        {slot ?? (
          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-3">
            <Link
              href={user ? '/settings' : '/login'}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                isScrolled
                  ? 'text-white/90 hover:text-white'
                  : 'text-text-secondary hover:text-text'
              )}
            >
              {user ? 'Settings' : 'Sign In'}
            </Link>
            <Link
              href="/editor"
              className={cn(
                'h-10 px-5 text-sm font-medium rounded-full transition-all inline-flex items-center justify-center',
                isScrolled
                  ? 'bg-transparent border-2 border-white text-white hover:bg-white/10'
                  : 'btn-pill btn-primary'
              )}
            >
              {user ? 'Editor' : 'Try Free'}
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
