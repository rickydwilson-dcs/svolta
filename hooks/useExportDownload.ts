'use client';

import * as React from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useUserStore } from '@/stores/user-store';
import { useCanvasExport } from '@/hooks/useCanvasExport';
import { useGifExport } from '@/hooks/useGifExport';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import type { ExportFormat as LibExportFormat } from '@/lib/canvas/export';
import type { AnimationStyle } from '@/lib/canvas/export-gif';
import { canvasLogger } from '@/lib/logger';
import { logExportEvent, type ExportType, type AspectRatio } from '@/lib/export-utils';

export interface ExportConfig {
  exportType: ExportType;
  aspectRatio: AspectRatio;
  animationStyle: AnimationStyle;
  duration: number;
  addLabels: boolean;
  removeWatermark: boolean;
  addLogo: boolean;
  hasBackgroundRemoved: boolean | undefined;
}

export interface UseExportDownloadReturn {
  handleDownload: () => Promise<void>;
  isExporting: boolean;
  isExportingGif: boolean;
  gifProgress: number;
  gifStatus: string;
  exportError: string | null;
  clearExportError: () => void;
}

export function useExportDownload(
  config: ExportConfig,
  callbacks: {
    onLimitReached: (isAnonymous: boolean) => void;
    onSuccess: () => void;
  }
): UseExportDownloadReturn {
  const beforePhoto = useEditorStore((s) => s.beforePhoto);
  const afterPhoto = useEditorStore((s) => s.afterPhoto);
  const alignment = useEditorStore((s) => s.alignment);
  const backgroundSettings = useEditorStore((s) => s.backgroundSettings);
  const subscription = useUserStore((s) => s.subscription);
  const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';
  const profile = useUserStore((state) => state.profile);

  const onLimitReachedRef = React.useRef(callbacks.onLimitReached);
  const onSuccessRef = React.useRef(callbacks.onSuccess);
  React.useLayoutEffect(() => {
    onLimitReachedRef.current = callbacks.onLimitReached;
    onSuccessRef.current = callbacks.onSuccess;
  }, [callbacks.onLimitReached, callbacks.onSuccess]);
  const { checkAndIncrement, isAnonymous } = useUsageLimit();
  const { isExporting, error: canvasError, exportAndDownload, clearError: clearCanvasError } = useCanvasExport();
  const {
    isExporting: isExportingGif,
    progress: gifProgress,
    status: gifStatus,
    error: gifError,
    exportAndDownload: exportGifAndDownload,
    clearError: clearGifError,
  } = useGifExport();

  const [exportError, setExportError] = React.useState<string | null>(null);

  const clearExportError = React.useCallback(() => {
    setExportError(null);
    clearCanvasError();
    clearGifError();
  }, [clearCanvasError, clearGifError]);

  const displayError = exportError || canvasError || gifError;

  const handleDownload = React.useCallback(async () => {
    if (!beforePhoto || !afterPhoto) return;

    setExportError(null);

    try {
      const result = await checkAndIncrement();

      if (!result.success) {
        if (result.reason === 'limit') {
          onLimitReachedRef.current(isAnonymous);
        } else if (result.reason === 'auth') {
          canvasLogger.error('Export blocked: session expired');
          setExportError('Session expired. Please sign in again.');
        } else {
          canvasLogger.error('Export blocked:', result.reason);
          setExportError('Export failed. Please try again.');
        }
        return;
      }

      const customLogoUrl = isPro && profile?.logo_url ? profile.logo_url : undefined;

      let success = false;

      if (config.exportType === 'gif') {
        success = await exportGifAndDownload(
          beforePhoto,
          afterPhoto,
          {
            format: config.aspectRatio as LibExportFormat,
            animationStyle: config.animationStyle,
            duration: config.duration,
            includeLabels: config.addLabels,
            watermark: {
              isPro: isPro && config.removeWatermark,
              customLogoUrl: config.addLogo ? customLogoUrl : undefined,
            },
            backgroundSettings: config.hasBackgroundRemoved ? backgroundSettings : undefined,
          }
        );
      } else {
        success = await exportAndDownload(
          beforePhoto,
          afterPhoto,
          alignment,
          {
            format: config.aspectRatio as LibExportFormat,
            resolution: 1080,
            includeLabels: config.addLabels,
            watermark: {
              isPro: isPro && config.removeWatermark,
              customLogoUrl: config.addLogo ? customLogoUrl : undefined,
            },
            quality: 0.92,
            backgroundSettings: config.hasBackgroundRemoved ? backgroundSettings : undefined,
          }
        );
      }

      canvasLogger.info('Export result', { success, exportType: config.exportType, aspectRatio: config.aspectRatio, isAnonymous });

      if (success) {
        canvasLogger.debug('Logging export event');
        logExportEvent(
          config.exportType === 'gif' ? 'gif' : 'png',
          config.aspectRatio,
          isAnonymous
        );
        onSuccessRef.current();
      }
    } catch (err) {
      canvasLogger.error('Export failed', err);
      setExportError(err instanceof Error ? err.message : 'Export failed');
    }
  }, [
    beforePhoto,
    afterPhoto,
    alignment,
    backgroundSettings,
    isPro,
    profile,
    checkAndIncrement,
    isAnonymous,
    exportAndDownload,
    exportGifAndDownload,
    config,
  ]);

  return {
    handleDownload,
    isExporting,
    isExportingGif,
    gifProgress,
    gifStatus,
    exportError: displayError,
    clearExportError,
  };
}
