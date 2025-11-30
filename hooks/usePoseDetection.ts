'use client';

/**
 * React hook for pose detection using MediaPipe
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initializePoseDetector,
  detectPoseFromDataUrl,
  isPoseDetectorReady,
  closePoseDetector,
} from '@/lib/mediapipe/pose-detector';
import type { PoseResult, Landmark } from '@/types/landmarks';
import { PoseDetectionError, PoseDetectionErrorType } from '@/types/landmarks';

interface UsePoseDetectionReturn {
  /** Whether the pose detector is initialized and ready */
  isReady: boolean;
  /** Whether detection is currently in progress */
  isDetecting: boolean;
  /** Error message if any */
  error: string | null;
  /** Error type for specific handling */
  errorType: PoseDetectionErrorType | null;
  /** Detect pose from a data URL */
  detect: (dataUrl: string) => Promise<Landmark[] | null>;
  /** Initialize the detector manually */
  initialize: () => Promise<void>;
  /** Clear the current error */
  clearError: () => void;
}

export function usePoseDetection(): UsePoseDetectionReturn {
  const [isReady, setIsReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<PoseDetectionErrorType | null>(null);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await initializePoseDetector();
        if (mounted) {
          setIsReady(true);
          setError(null);
          setErrorType(null);
        }
      } catch (err) {
        if (mounted) {
          if (err instanceof PoseDetectionError) {
            setError(err.message);
            setErrorType(err.type);
          } else {
            setError('Failed to initialize pose detection');
            setErrorType(PoseDetectionErrorType.INITIALIZATION_FAILED);
          }
        }
      }
    };

    // Check if already ready
    if (isPoseDetectorReady()) {
      setIsReady(true);
    } else {
      init();
    }

    // Cleanup on unmount
    return () => {
      mounted = false;
      // Don't close the detector - keep it for reuse
    };
  }, []);

  const initialize = useCallback(async () => {
    try {
      setError(null);
      setErrorType(null);
      await initializePoseDetector();
      setIsReady(true);
    } catch (err) {
      if (err instanceof PoseDetectionError) {
        setError(err.message);
        setErrorType(err.type);
      } else {
        setError('Failed to initialize pose detection');
        setErrorType(PoseDetectionErrorType.INITIALIZATION_FAILED);
      }
      throw err;
    }
  }, []);

  const detect = useCallback(async (dataUrl: string): Promise<Landmark[] | null> => {
    if (!isReady) {
      // Try to initialize if not ready
      try {
        await initialize();
      } catch {
        return null;
      }
    }

    setIsDetecting(true);
    setError(null);
    setErrorType(null);

    try {
      const result: PoseResult = await detectPoseFromDataUrl(dataUrl);
      return result.landmarks;
    } catch (err) {
      if (err instanceof PoseDetectionError) {
        setError(err.message);
        setErrorType(err.type);
      } else {
        setError('Pose detection failed');
        setErrorType(PoseDetectionErrorType.DETECTION_FAILED);
      }
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, [isReady, initialize]);

  const clearError = useCallback(() => {
    setError(null);
    setErrorType(null);
  }, []);

  return {
    isReady,
    isDetecting,
    error,
    errorType,
    detect,
    initialize,
    clearError,
  };
}
