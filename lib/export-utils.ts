import { canvasLogger } from '@/lib/logger';

// Timeout wrapper for long-running operations
export function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

export const TIMEOUT_MS = 60000;

// localStorage key for anonymous user ID (persists across sessions for analytics)
export const ANON_ID_KEY = 'svolta_anon_id';

/**
 * Get or create a persistent anonymous ID for analytics tracking
 */
export function getAnonId(): string {
  if (typeof window === 'undefined') return '';

  let anonId = localStorage.getItem(ANON_ID_KEY);
  if (!anonId) {
    // Generate a random ID (not a fingerprint - just for session grouping)
    anonId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(ANON_ID_KEY, anonId);
  }
  return anonId;
}

/**
 * Log export event to analytics API (fire and forget)
 */
export function logExportEvent(format: 'png' | 'gif', aspectRatio: string, isAnonymous: boolean): void {
  const body: Record<string, string> = {
    export_format: format,
    aspect_ratio: aspectRatio,
  };

  if (isAnonymous) {
    body.anon_id = getAnonId();
  }

  // Fire and forget - don't block export on analytics
  fetch('/api/exports/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err) => {
    // Silently fail - analytics shouldn't break exports
    canvasLogger.warn('Failed to log export analytics', err);
  });
}

export type ExportType = 'png' | 'gif';
export type AspectRatio = '4:5' | '1:1' | '9:16';
export type BackgroundType = 'original' | 'transparent' | 'color' | 'image';

export interface BackgroundState {
  type: BackgroundType;
  colorValue?: string;
  imageId?: string;
  customImageUrl?: string;
}

// Animation style options with icons
export const animationStyleOptions = [
  { value: 'slider', label: '↔', title: 'Slider' },
  { value: 'crossfade', label: '◐', title: 'Fade' },
  { value: 'toggle', label: '⇄', title: 'Toggle' },
];

// Image presets for background (placeholder IDs)
export const imagePresets = [
  { id: 'gym', thumbnail: '/backgrounds/gym.jpg', label: 'Gym' },
  { id: 'studio', thumbnail: '/backgrounds/studio.jpg', label: 'Studio' },
  { id: 'outdoor', thumbnail: '/backgrounds/outdoor.jpg', label: 'Outdoor' },
];
