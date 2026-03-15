'use client';

import { MediaPipeProvider } from '@/components/providers/MediaPipeProvider';
import { AppTabBar } from '@/components/layout/AppTabBar';

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
      <main id="main-content">{children}</main>
      <AppTabBar />
    </MediaPipeProvider>
  );
}
