'use client';

import { useIsStandalone } from '@/lib/hooks/useStandaloneDetect';
import { MarketingHeader } from './MarketingHeader';
import { AppTabBar } from './AppTabBar';
import { AppHomeOverlay } from '@/components/home/AppHomeOverlay';

interface MarketingLayoutShellProps {
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function MarketingLayoutShell({ children, footer }: MarketingLayoutShellProps) {
  const isStandalone = useIsStandalone();

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      {/* Marketing header: always on web, desktop-only in standalone */}
      <div className={isStandalone ? 'hidden lg:block' : ''}>
        <MarketingHeader />
      </div>

      <main id="main-content" className={`flex-1 w-full ${isStandalone ? 'lg:pt-20' : 'pt-20'}`}>
        {children}
        {/* Footer scrolls into view from behind the bottom nav */}
        {footer}
      </main>

      {/* No footer rendered here — it's now inside main above */}

      {/* App home overlay (standalone only) + tab bar (always on mobile) */}
      <AppHomeOverlay />
      <AppTabBar />
    </div>
  );
}
