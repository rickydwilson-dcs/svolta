/**
 * useAlignment Hook
 * Manages real-time alignment calculations and updates
 * Subscribes to editor store and provides debounced alignment actions
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { calculateAlignment, canCalculateAlignment } from '@/lib/canvas/alignment';
import type { AlignmentSettings } from '@/types/editor';

export interface UseAlignmentReturn {
  alignment: AlignmentSettings;
  isAligned: boolean;
  canAlign: boolean;
  autoAlign: () => void;
  resetAlignment: () => void;
}

/**
 * Debounce delay for alignment updates (milliseconds)
 */
const DEBOUNCE_DELAY = 100;

/**
 * Hook for managing photo alignment with real-time preview
 *
 * Features:
 * - Subscribes to alignment state from editor store
 * - Debounces updates for performance
 * - Auto-calculates alignment based on landmarks
 * - Validates if alignment is possible
 *
 * @returns Alignment state and actions
 */
export function useAlignment(): UseAlignmentReturn {
  // Subscribe to editor store
  const beforePhoto = useEditorStore((state) => state.beforePhoto);
  const afterPhoto = useEditorStore((state) => state.afterPhoto);
  const alignment = useEditorStore((state) => state.alignment);
  const updateAlignment = useEditorStore((state) => state.updateAlignment);

  // Local state for debouncing
  const [isAligned, setIsAligned] = useState(false);
  const [canAlign, setCanAlign] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if auto-alignment is possible
   */
  useEffect(() => {
    const bothPhotosExist = beforePhoto && afterPhoto;
    const bothHaveLandmarks =
      beforePhoto?.landmarks &&
      afterPhoto?.landmarks;

    if (!bothPhotosExist || !bothHaveLandmarks) {
      setCanAlign(false);
      setIsAligned(false);
      return;
    }

    // Check if landmarks are valid for current anchor
    const canAlignBefore = canCalculateAlignment(
      beforePhoto.landmarks!,
      alignment.anchor
    );
    const canAlignAfter = canCalculateAlignment(
      afterPhoto.landmarks!,
      alignment.anchor
    );

    setCanAlign(canAlignBefore && canAlignAfter);

    // Check if currently aligned (non-default values)
    const hasAlignment =
      alignment.scale !== 1 ||
      alignment.offsetX !== 0 ||
      alignment.offsetY !== 0;

    setIsAligned(hasAlignment);
  }, [beforePhoto, afterPhoto, alignment]);

  /**
   * Auto-align photos based on landmarks
   * Uses debouncing to prevent excessive recalculations
   */
  const autoAlign = useCallback(() => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the alignment calculation
    debounceTimerRef.current = setTimeout(() => {
      if (!beforePhoto?.landmarks || !afterPhoto?.landmarks) {
        console.warn('Cannot auto-align: missing landmarks');
        return;
      }

      // Calculate alignment
      const result = calculateAlignment(
        beforePhoto.landmarks,
        afterPhoto.landmarks,
        alignment.anchor,
        { width: beforePhoto.width, height: beforePhoto.height },
        { width: afterPhoto.width, height: afterPhoto.height }
      );

      // Update store with calculated values
      updateAlignment({
        scale: result.scale,
        offsetX: result.offsetX,
        offsetY: result.offsetY,
      });

      setIsAligned(true);
    }, DEBOUNCE_DELAY);
  }, [beforePhoto, afterPhoto, alignment.anchor, updateAlignment]);

  /**
   * Reset alignment to default values
   */
  const resetAlignment = useCallback(() => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    updateAlignment({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });

    setIsAligned(false);
  }, [updateAlignment]);

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    alignment,
    isAligned,
    canAlign,
    autoAlign,
    resetAlignment,
  };
}
