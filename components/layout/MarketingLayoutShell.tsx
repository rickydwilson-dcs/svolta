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

      <main id="main-content" className={`flex-1 ${isStandalone ? 'lg:pt-20' : 'pt-20'}`}>
        {children}
      </main>

      {/* Footer: always on web, desktop-only in standalone */}
      <div className={isStandalone ? 'hidden lg:block' : ''}>
        {footer}
      </div>

      {/* Standalone-only: app home overlay + tab bar */}
      <AppHomeOverlay />
      {isStandalone && <AppTabBar />}
    </div>
  );
}
