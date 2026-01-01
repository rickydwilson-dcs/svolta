/**
 * GIF Export Hook
 * Provides functionality for exporting animated GIF comparisons with progress tracking
 */

import { useState, useCallback, useRef } from 'react';
import { exportGif, triggerGifDownload, type GifExportOptions, type PhotoData } from '@/lib/canvas/export-gif';

/**
 * Status of GIF export operation
 */
export type GifExportStatus = 'idle' | 'frames' | 'encoding' | 'complete' | 'error';

/**
 * Return type for useGifExport hook
 */
export interface UseGifExportReturn {
  isExporting: boolean;
  progress: number; // 0-100
  status: GifExportStatus;
  error: string | null;

  // Export and download GIF
  exportAndDownload: (
    beforePhoto: PhotoData,
    afterPhoto: PhotoData,
    options: Omit<GifExportOptions, 'onProgress'>
  ) => Promise<boolean>;

  // Cancel ongoing export
  cancel: () => void;

  // Clear error state
  clearError: () => void;
}

/**
 * Hook for managing GIF export functionality
 *
 * Provides progress tracking, cancellation, and error handling for GIF exports.
 * Uses the same alignment algorithm as PNG export for consistent results.
 *
 * @returns Object with export state and control functions
 *
 * @example
 * ```tsx
 * const { isExporting, progress, status, exportAndDownload } = useGifExport();
 *
 * const handleExport = async () => {
 *   const success = await exportAndDownload(
 *     beforePhoto,
 *     afterPhoto,
 *     {
 *       format: '1:1',
 *       animationStyle: 'slider',
 *       duration: 2,
 *       includeLabels: true,
 *       watermark: { isPro: false }
 *     }
 *   );
 * };
 * ```
 */
export function useGifExport(): UseGifExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GifExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Track if export was cancelled
  const cancelledRef = useRef(false);

  /**
   * Export GIF and trigger browser download
   *
   * @param beforePhoto - Before photo data with landmarks
   * @param afterPhoto - After photo data with landmarks
   * @param options - GIF export options (format, animation style, etc.)
   * @returns Promise<boolean> - True if successful, false otherwise
   */
  const exportAndDownload = useCallback(
    async (
      beforePhoto: PhotoData,
      afterPhoto: PhotoData,
      options: Omit<GifExportOptions, 'onProgress'>
    ): Promise<boolean> => {
      // Reset state
      setError(null);
      setProgress(0);
      setStatus('frames');
      cancelledRef.current = false;

      // Validate inputs
      if (!beforePhoto || !afterPhoto) {
        setError('Both before and after photos are required');
        setStatus('error');
        return false;
      }

      if (!beforePhoto.dataUrl || !afterPhoto.dataUrl) {
        setError('Photo data is missing');
        setStatus('error');
        return false;
      }

      try {
        // Set loading state
        setIsExporting(true);

        // Export GIF with progress tracking
        const result = await exportGif(beforePhoto, afterPhoto, {
          ...options,
          onProgress: (progressValue: number, progressStatus: 'frames' | 'encoding') => {
            // Check if cancelled
            if (cancelledRef.current) {
              throw new Error('Export cancelled by user');
            }

            // Update progress (0-1 from library, convert to 0-100)
            setProgress(Math.round(progressValue * 100));
            setStatus(progressStatus);
          },
        });

        // Check if cancelled before download
        if (cancelledRef.current) {
          return false;
        }

        // Trigger browser download
        triggerGifDownload(result.blob, result.filename);

        // Mark as complete
        setProgress(100);
        setStatus('complete');

        console.log('[useGifExport] Export successful:', {
          filename: result.filename,
          fileSize: `${(result.fileSize / 1024 / 1024).toFixed(2)} MB`,
          frameCount: result.frameCount,
        });

        return true;
      } catch (err) {
        // Don't show error if cancelled
        if (cancelledRef.current) {
          console.log('[useGifExport] Export cancelled');
          return false;
        }

        console.error('[useGifExport] Export failed:', err);

        // Set user-friendly error message
        const errorMessage = err instanceof Error ? err.message : 'Failed to export GIF';
        setError(errorMessage);
        setStatus('error');

        return false;
      } finally {
        // Clear loading state
        setIsExporting(false);

        // Reset progress after delay if complete
        if (!cancelledRef.current && status === 'complete') {
          setTimeout(() => {
            setProgress(0);
            setStatus('idle');
          }, 2000);
        }
      }
    },
    [status]
  );

  /**
   * Cancel ongoing export operation
   */
  const cancel = useCallback(() => {
    if (isExporting) {
      console.log('[useGifExport] Cancelling export');
      cancelledRef.current = true;
      setIsExporting(false);
      setProgress(0);
      setStatus('idle');
    }
  }, [isExporting]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  return {
    isExporting,
    progress,
    status,
    error,
    exportAndDownload,
    cancel,
    clearError,
  };
}
