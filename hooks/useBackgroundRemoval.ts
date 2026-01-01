'use client';

/**
 * React hook for background removal and replacement using MediaPipe
 * Provides progress tracking, cancellation, and efficient mask reuse
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  removeBackground,
  applyBackground,
  type SegmentationResult,
  type SegmentationOptions,
} from '@/lib/segmentation/background-removal';
import type { BackgroundSettings } from '@/lib/segmentation/backgrounds';

export interface UseBackgroundRemovalReturn {
  /** Whether background processing is in progress */
  isProcessing: boolean;
  /** Current progress (0-1) for long operations */
  progress: number;
  /** Error message if any */
  error: string | null;

  /**
   * Remove background from image
   * Returns segmentation result with mask for later reuse
   *
   * @param imageDataUrl - Original image data URL
   * @returns SegmentationResult with mask and processed image, or null on error
   */
  processImage: (imageDataUrl: string) => Promise<SegmentationResult | null>;

  /**
   * Apply new background using existing mask (fast operation)
   * Use this to quickly change backgrounds without re-segmenting
   *
   * @param originalDataUrl - Original image without background removed
   * @param mask - Previously generated segmentation mask
   * @param settings - Background settings to apply
   * @returns New data URL with background applied, or null on error
   */
  changeBackground: (
    originalDataUrl: string,
    mask: ImageData,
    settings: BackgroundSettings
  ) => Promise<string | null>;

  /** Cancel ongoing operation */
  cancel: () => void;

  /** Clear error state */
  clearError: () => void;
}

/**
 * Hook for background removal and replacement
 *
 * Features:
 * - Progress tracking for long operations
 * - Cancellation support
 * - Efficient mask reuse for fast background changes
 * - Automatic cleanup on unmount
 *
 * @example
 * ```typescript
 * const { processImage, changeBackground, isProcessing, progress } = useBackgroundRemoval();
 *
 * // Remove background once
 * const result = await processImage(photoDataUrl);
 *
 * // Quickly change backgrounds using cached mask
 * const newPhoto = await changeBackground(
 *   originalDataUrl,
 *   result.mask,
 *   { type: 'solid', color: '#ffffff' }
 * );
 * ```
 */
export function useBackgroundRemoval(): UseBackgroundRemovalReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Cancellation token - set to true to cancel ongoing operations
  const cancelledRef = useRef(false);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cancelledRef.current = true;
    };
  }, []);

  /**
   * Process image to remove background
   * This is the expensive operation that generates the segmentation mask
   */
  const processImage = useCallback(
    async (imageDataUrl: string): Promise<SegmentationResult | null> => {
      // Reset state
      if (!isMountedRef.current) return null;

      setIsProcessing(true);
      setProgress(0);
      setError(null);
      cancelledRef.current = false;

      try {
        // Progress callback that checks for cancellation
        const onProgress = (p: number) => {
          if (!isMountedRef.current) return;

          // Check if cancelled
          if (cancelledRef.current) {
            throw new Error('Operation cancelled by user');
          }

          setProgress(p);
        };

        // Perform segmentation with progress tracking
        const options: SegmentationOptions = {
          onProgress,
          threshold: 0.5, // Medium confidence threshold
        };

        const result = await removeBackground(imageDataUrl, options);

        // Check if still mounted and not cancelled
        if (!isMountedRef.current || cancelledRef.current) {
          return null;
        }

        setProgress(1);
        return result;
      } catch (err) {
        // Only set error if still mounted and not cancelled
        if (isMountedRef.current && !cancelledRef.current) {
          const errorMessage = err instanceof Error
            ? err.message
            : 'Failed to process image';

          console.error('Background removal failed:', err);
          setError(errorMessage);
        }

        return null;
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
        }
      }
    },
    []
  );

  /**
   * Apply new background using existing mask
   * This is fast - no AI processing, just canvas compositing
   */
  const changeBackground = useCallback(
    async (
      originalDataUrl: string,
      mask: ImageData,
      settings: BackgroundSettings
    ): Promise<string | null> => {
      // Reset state
      if (!isMountedRef.current) return null;

      setIsProcessing(true);
      setProgress(0);
      setError(null);
      cancelledRef.current = false;

      try {
        // Quick progress updates (background change is fast)
        setProgress(0.3);

        // Check if cancelled
        if (cancelledRef.current) {
          throw new Error('Operation cancelled by user');
        }

        // Apply background using pre-computed mask
        const result = await applyBackground(originalDataUrl, mask, settings);

        // Check if still mounted and not cancelled
        if (!isMountedRef.current || cancelledRef.current) {
          return null;
        }

        setProgress(1);
        return result;
      } catch (err) {
        // Only set error if still mounted and not cancelled
        if (isMountedRef.current && !cancelledRef.current) {
          const errorMessage = err instanceof Error
            ? err.message
            : 'Failed to apply background';

          console.error('Background application failed:', err);
          setError(errorMessage);
        }

        return null;
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
        }
      }
    },
    []
  );

  /**
   * Cancel ongoing operation
   * Sets cancellation flag and resets state
   */
  const cancel = useCallback(() => {
    cancelledRef.current = true;

    if (isMountedRef.current) {
      setIsProcessing(false);
      setProgress(0);
      setError('Operation cancelled');
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  return {
    isProcessing,
    progress,
    error,
    processImage,
    changeBackground,
    cancel,
    clearError,
  };
}
