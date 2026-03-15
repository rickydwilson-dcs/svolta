'use client';

import { MediaPipeProvider } from '@/components/providers/MediaPipeProvider';
import { AppTabBar } from '@/components/layout/AppTabBar';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { HeaderSlotProvider } from '@/components/layout/HeaderSlotContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MediaPipeProvider>
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <HeaderSlotProvider>
        <MarketingHeader />
        <main id="main-content">{children}</main>
        <AppTabBar />
      </HeaderSlotProvider>
    </MediaPipeProvider>
  );
}
