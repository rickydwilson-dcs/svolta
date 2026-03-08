'use client';

import * as React from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';
import type { Photo } from '@/types/editor';
import { withTimeout, TIMEOUT_MS } from '@/lib/export-utils';
import { editorLogger } from '@/lib/logger';

export interface UseExportBackgroundRemovalReturn {
  isRemovingBackgrounds: boolean;
  error: string | null;
  clearError: () => void;
  removeBackgrounds: () => Promise<void>;
  hasBackgroundRemoved: boolean | undefined;
}

export function useExportBackgroundRemoval(): UseExportBackgroundRemovalReturn {
  const beforePhoto = useEditorStore((s) => s.beforePhoto);
  const afterPhoto = useEditorStore((s) => s.afterPhoto);
  const setBeforePhoto = useEditorStore((s) => s.setBeforePhoto);
  const setAfterPhoto = useEditorStore((s) => s.setAfterPhoto);
  const { processImage: removeBackground } = useBackgroundRemoval();

  const [isRemovingBackgrounds, setIsRemovingBackgrounds] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasBackgroundRemoved = beforePhoto?.hasBackgroundRemoved || afterPhoto?.hasBackgroundRemoved;

  const clearError = React.useCallback(() => setError(null), []);

  const removeBackgrounds = React.useCallback(async () => {
    if (!beforePhoto || !afterPhoto) return;

    setIsRemovingBackgrounds(true);
    setError(null);

    try {
      // Remove backgrounds in parallel for ~2x speedup
      const [beforeResult, afterResult] = await Promise.all([
        !beforePhoto.hasBackgroundRemoved
          ? withTimeout(
              removeBackground(beforePhoto.dataUrl),
              TIMEOUT_MS,
              'Background removal timed out for "Before" photo. Please try again or use a smaller image.'
            )
          : Promise.resolve(null),
        !afterPhoto.hasBackgroundRemoved
          ? withTimeout(
              removeBackground(afterPhoto.dataUrl),
              TIMEOUT_MS,
              'Background removal timed out for "After" photo. Please try again or use a smaller image.'
            )
          : Promise.resolve(null),
      ]);

      if (beforeResult) {
        const updatedBefore: Photo = {
          ...beforePhoto,
          dataUrl: beforeResult.processedDataUrl,
          hasBackgroundRemoved: true,
          originalDataUrl: beforePhoto.originalDataUrl || beforePhoto.dataUrl,
          segmentationMask: beforeResult.mask,
        };
        setBeforePhoto(updatedBefore);
      }

      if (afterResult) {
        const updatedAfter: Photo = {
          ...afterPhoto,
          dataUrl: afterResult.processedDataUrl,
          hasBackgroundRemoved: true,
          originalDataUrl: afterPhoto.originalDataUrl || afterPhoto.dataUrl,
          segmentationMask: afterResult.mask,
        };
        setAfterPhoto(updatedAfter);
      }
    } catch (err) {
      editorLogger.error('Background removal failed', err);
      setError(err instanceof Error ? err.message : 'Background removal failed');
    } finally {
      setIsRemovingBackgrounds(false);
    }
  }, [beforePhoto, afterPhoto, removeBackground, setBeforePhoto, setAfterPhoto]);

  return {
    isRemovingBackgrounds,
    error,
    clearError,
    removeBackgrounds,
    hasBackgroundRemoved,
  };
}
