/**
 * Alignment Debug Logger
 *
 * Toggleable debug logging for alignment exports with file output.
 * Logs are written to debug/alignment-log.json for easy comparison.
 *
 * Toggle via:
 * - localStorage: localStorage.setItem('svolta_debug_alignment', 'true')
 * - Environment: NEXT_PUBLIC_DEBUG_ALIGNMENT=true
 */

import type { AlignedDrawResult } from '@/lib/canvas/aligned-draw-params';
import type { Landmark } from '@/types/landmarks';

const DEBUG_KEY = 'svolta_debug_alignment';

/**
 * Check if alignment debug logging is enabled
 */
export function isAlignmentDebugEnabled(): boolean {
  // Check env var first (works in both server and client)
  if (process.env.NEXT_PUBLIC_DEBUG_ALIGNMENT === 'true') return true;

  // Check localStorage (browser only)
  if (typeof window !== 'undefined') {
    return localStorage.getItem(DEBUG_KEY) === 'true';
  }

  return false;
}

/**
 * Enable or disable alignment debug logging
 */
export function setAlignmentDebug(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    if (enabled) {
      localStorage.setItem(DEBUG_KEY, 'true');
      console.log('🔍 Alignment debug logging ENABLED');
    } else {
      localStorage.removeItem(DEBUG_KEY);
      console.log('🔍 Alignment debug logging DISABLED');
    }
  }
}

/**
 * Structured landmark summary for logging
 */
interface LandmarkSummary {
  count: number;
  nose?: { y: number; visibility: number };
  leftShoulder?: { x: number; y: number; visibility: number };
  rightShoulder?: { x: number; y: number; visibility: number };
  leftHip?: { y: number; visibility: number };
  rightHip?: { y: number; visibility: number };
}

/**
 * Full alignment log entry structure
 */
export interface AlignmentLogEntry {
  timestamp: string;
  input: {
    beforeImg: { width: number; height: number };
    afterImg: { width: number; height: number };
    targetWidth: number;
    targetHeight: number;
    beforeLandmarks: LandmarkSummary | null;
    afterLandmarks: LandmarkSummary | null;
  };
  result: {
    before: {
      drawX: number;
      drawY: number;
      drawWidth: number;
      drawHeight: number;
    };
    after: {
      drawX: number;
      drawY: number;
      drawWidth: number;
      drawHeight: number;
    };
    useShoulderAlignment: boolean;
    cropTopOffset: number;
  };
  metadata: {
    source: 'png' | 'gif' | 'preview';
  };
}

/**
 * Extract key landmarks for logging
 */
export function extractLandmarkSummary(
  landmarks: Landmark[] | undefined
): LandmarkSummary | null {
  if (!landmarks || landmarks.length < 33) {
    return landmarks ? { count: landmarks.length } : null;
  }

  return {
    count: landmarks.length,
    nose: {
      y: landmarks[0]?.y ?? 0,
      visibility: landmarks[0]?.visibility ?? 0,
    },
    leftShoulder: {
      x: landmarks[11]?.x ?? 0,
      y: landmarks[11]?.y ?? 0,
      visibility: landmarks[11]?.visibility ?? 0,
    },
    rightShoulder: {
      x: landmarks[12]?.x ?? 0,
      y: landmarks[12]?.y ?? 0,
      visibility: landmarks[12]?.visibility ?? 0,
    },
    leftHip: {
      y: landmarks[23]?.y ?? 0,
      visibility: landmarks[23]?.visibility ?? 0,
    },
    rightHip: {
      y: landmarks[24]?.y ?? 0,
      visibility: landmarks[24]?.visibility ?? 0,
    },
  };
}

/**
 * Build a log entry from alignment inputs and results
 */
export function buildLogEntry(
  beforeImg: { width: number; height: number },
  afterImg: { width: number; height: number },
  beforeLandmarks: Landmark[] | undefined,
  afterLandmarks: Landmark[] | undefined,
  targetWidth: number,
  targetHeight: number,
  result: AlignedDrawResult,
  source: 'png' | 'gif' | 'preview'
): AlignmentLogEntry {
  return {
    timestamp: new Date().toISOString(),
    input: {
      beforeImg,
      afterImg,
      targetWidth,
      targetHeight,
      beforeLandmarks: extractLandmarkSummary(beforeLandmarks),
      afterLandmarks: extractLandmarkSummary(afterLandmarks),
    },
    result: {
      before: {
        drawX: Math.round(result.before.drawX * 100) / 100,
        drawY: Math.round(result.before.drawY * 100) / 100,
        drawWidth: Math.round(result.before.drawWidth * 100) / 100,
        drawHeight: Math.round(result.before.drawHeight * 100) / 100,
      },
      after: {
        drawX: Math.round(result.after.drawX * 100) / 100,
        drawY: Math.round(result.after.drawY * 100) / 100,
        drawWidth: Math.round(result.after.drawWidth * 100) / 100,
        drawHeight: Math.round(result.after.drawHeight * 100) / 100,
      },
      useShoulderAlignment: result.useShoulderAlignment ?? false,
      cropTopOffset: Math.round((result.cropTopOffset ?? 0) * 10000) / 10000,
    },
    metadata: { source },
  };
}

/**
 * Log alignment data to console and optionally to file
 *
 * This function is fire-and-forget - it won't block exports
 * and silently fails if file writing is unavailable.
 */
export async function logAlignment(entry: AlignmentLogEntry): Promise<void> {
  // Always log to console when debug is enabled
  console.log('🔍 [DEBUG] Alignment Log Entry:', entry);

  // Attempt to write to file (fire and forget)
  try {
    await fetch('/api/debug/alignment-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // Silently fail - don't break exports
  }
}

// Expose helper for browser console usage
if (typeof window !== 'undefined') {
  // @ts-expect-error - Expose to window for easy console access
  window.svoltaDebug = {
    enable: () => setAlignmentDebug(true),
    disable: () => setAlignmentDebug(false),
    isEnabled: () => isAlignmentDebugEnabled(),
  };
}
