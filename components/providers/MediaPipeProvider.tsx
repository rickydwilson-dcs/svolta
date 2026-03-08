'use client';

import { useEffect } from 'react';
import { initializePoseDetector } from '@/lib/mediapipe/pose-detector';
import { MediaPipeLoader } from '@/components/features/editor/MediaPipeLoader';
import { poseLogger } from '@/lib/logger';

export function MediaPipeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Preload MediaPipe during idle time (non-blocking)
    const preload = () => {
      initializePoseDetector().catch((err) => {
        poseLogger.warn('MediaPipe preload failed', err);
        // Fail silently - user can try again when they need it
      });
    };

    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload, { timeout: 2000 });
    } else {
      // Fallback for Safari
      setTimeout(preload, 1000);
    }
  }, []);

  return (
    <>
      <MediaPipeLoader />
      {children}
    </>
  );
}
