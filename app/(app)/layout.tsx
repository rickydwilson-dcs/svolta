'use client';

import { MediaPipeProvider } from '@/components/providers/MediaPipeProvider';

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
      {/* Editor has its own header, so no app-level header needed */}
      {children}
    </MediaPipeProvider>
  );
}
