/**
 * Canvas Export Hook
 * Provides functionality for exporting aligned photos with loading states
 */

import { useState } from 'react';
import { exportCanvas, triggerDownload, type ExportOptions } from '@/lib/canvas/export';
import type { Photo, AlignmentSettings } from '@/types/editor';
import { useEditorStore } from '@/stores/editor-store';
import { canvasLogger } from '@/lib/logger';

/**
 * Hook for managing canvas export functionality
 *
 * @returns Object with export state and exportAndDownload function
 */
export function useCanvasExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userFraming = useEditorStore((state) => state.userFraming);

  /**
   * Export canvas and trigger browser download
   *
   * @param beforePhoto - Before photo data
   * @param afterPhoto - After photo data
   * @param alignment - Alignment settings (includes anchor type)
   * @param options - Export options
   * @returns Promise<boolean> - True if successful, false otherwise
   */
  const exportAndDownload = async (
    beforePhoto: Photo,
    afterPhoto: Photo,
    alignment: AlignmentSettings,
    options: ExportOptions
  ): Promise<boolean> => {
    // Reset error state
    setError(null);

    // Validate inputs
    if (!beforePhoto || !afterPhoto) {
      setError('Both before and after photos are required');
      return false;
    }

    if (!beforePhoto.dataUrl || !afterPhoto.dataUrl) {
      setError('Photo data is missing');
      return false;
    }

    try {
      // Set loading state
      setIsExporting(true);

      // Prepare photo data for export (including landmarks for alignment calculation)
      const beforePhotoData = {
        dataUrl: beforePhoto.dataUrl,
        width: beforePhoto.width,
        height: beforePhoto.height,
        landmarks: beforePhoto.landmarks ?? undefined,
      };

      const afterPhotoData = {
        dataUrl: afterPhoto.dataUrl,
        width: afterPhoto.width,
        height: afterPhoto.height,
        landmarks: afterPhoto.landmarks ?? undefined,
      };

      // Export canvas - alignment is calculated at export time based on landmarks and anchor
      const result = await exportCanvas(
        beforePhotoData,
        afterPhotoData,
        alignment.anchor,
        { ...options, userFraming }
      );

      // Trigger browser download
      triggerDownload(result.blob, result.filename);

      return true;
    } catch (err) {
      canvasLogger.error('Export failed', err);

      // Set user-friendly error message
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to export canvas';
      setError(errorMessage);

      return false;
    } finally {
      // Clear loading state
      setIsExporting(false);
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => setError(null);

  return {
    isExporting,
    error,
    exportAndDownload,
    clearError,
  };
}
