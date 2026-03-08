/**
 * useAlignment Hook
 * Manages real-time alignment calculations and updates
 * Subscribes to editor store and provides debounced alignment actions
 */

import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { poseLogger } from '@/lib/logger';
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
  const beforeLandmarks = useEditorStore((state) => state.beforePhoto?.landmarks ?? null);
  const afterLandmarks = useEditorStore((state) => state.afterPhoto?.landmarks ?? null);
  const hasBeforePhoto = useEditorStore((state) => !!state.beforePhoto);
  const hasAfterPhoto = useEditorStore((state) => !!state.afterPhoto);
  const alignment = useEditorStore((state) => state.alignment);
  const updateAlignment = useEditorStore((state) => state.updateAlignment);

  // Ref for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Compute canAlign from current state (no setState in effect)
   */
  const canAlign = useMemo(() => {
    const bothPhotosExist = hasBeforePhoto && hasAfterPhoto;
    const bothHaveLandmarks = beforeLandmarks && afterLandmarks;

    if (!bothPhotosExist || !bothHaveLandmarks) {
      return false;
    }

    // Check if landmarks are valid for current anchor
    const canAlignBefore = canCalculateAlignment(
      beforeLandmarks,
      alignment.anchor
    );
    const canAlignAfter = canCalculateAlignment(
      afterLandmarks,
      alignment.anchor
    );

    return canAlignBefore && canAlignAfter;
  }, [hasBeforePhoto, hasAfterPhoto, beforeLandmarks, afterLandmarks, alignment.anchor]);

  /**
   * Compute isAligned from current state (no setState in effect)
   */
  const isAligned = useMemo(() => {
    return (
      alignment.scale !== 1 ||
      alignment.offsetX !== 0 ||
      alignment.offsetY !== 0
    );
  }, [alignment.scale, alignment.offsetX, alignment.offsetY]);

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
      if (!beforeLandmarks || !afterLandmarks) {
        poseLogger.warn('Cannot auto-align: missing landmarks');
        return;
      }

      // Calculate alignment (uses normalized coordinates)
      const result = calculateAlignment(
        beforeLandmarks,
        afterLandmarks,
        alignment.anchor
      );

      // Update store with calculated values
      // isAligned is now computed via useMemo, so no need to call setIsAligned
      updateAlignment({
        scale: result.scale,
        offsetX: result.offsetX,
        offsetY: result.offsetY,
      });
    }, DEBOUNCE_DELAY);
  }, [beforeLandmarks, afterLandmarks, alignment.anchor, updateAlignment]);

  /**
   * Reset alignment to default values
   */
  const resetAlignment = useCallback(() => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // isAligned is now computed via useMemo, so no need to call setIsAligned
    updateAlignment({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
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
