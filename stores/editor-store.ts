/**
 * Editor State Management with Zustand
 * Manages photos, landmarks, alignment settings, and editor UI state
 */

import { create } from 'zustand';
import { revokeBlobUrl, revokePhotoUrls } from '@/lib/utils/object-url';
import type { Photo, AlignmentSettings, UserFramingOverride } from '@/types/editor';
import { DEFAULT_USER_FRAMING } from '@/types/editor';
import type { Landmark } from '@/types/landmarks';
import type { BackgroundSettings } from '@/lib/segmentation/backgrounds';

interface EditorState {
  // Photos
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;

  // Settings
  alignment: AlignmentSettings;
  showLandmarks: boolean;
  showGrid: boolean;
  userFraming: UserFramingOverride;

  // Background removal settings for export
  backgroundSettings: BackgroundSettings;

  // Status
  isDetecting: boolean;
  error: string | null;

  // Actions
  setBeforePhoto: (photo: Photo | null) => void;
  setAfterPhoto: (photo: Photo | null) => void;
  setBeforeLandmarks: (landmarks: Landmark[] | null) => void;
  setAfterLandmarks: (landmarks: Landmark[] | null) => void;
  updateAlignment: (settings: Partial<AlignmentSettings>) => void;
  setBackgroundSettings: (settings: BackgroundSettings) => void;
  toggleLandmarks: () => void;
  toggleGrid: () => void;
  setUserFraming: (partial: Partial<UserFramingOverride>) => void;
  resetUserFraming: () => void;
  setIsDetecting: (detecting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialAlignment: AlignmentSettings = {
  anchor: 'full',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

const defaultBackgroundSettings: BackgroundSettings = {
  type: 'original', // Don't modify background by default
};

function revokeReplacedPhotoUrls(
  previousPhoto: Photo | null,
  nextPhoto: Photo | null
): void {
  if (!previousPhoto) return;

  const nextUrls = new Set<string>();
  if (nextPhoto?.dataUrl) nextUrls.add(nextPhoto.dataUrl);
  if (nextPhoto?.originalDataUrl) nextUrls.add(nextPhoto.originalDataUrl);

  if (!nextUrls.has(previousPhoto.dataUrl)) {
    revokeBlobUrl(previousPhoto.dataUrl);
  }

  if (
    previousPhoto.originalDataUrl &&
    previousPhoto.originalDataUrl !== previousPhoto.dataUrl &&
    !nextUrls.has(previousPhoto.originalDataUrl)
  ) {
    revokeBlobUrl(previousPhoto.originalDataUrl);
  }
}

export const useEditorStore = create<EditorState>((set) => ({
  // Initial state
  beforePhoto: null,
  afterPhoto: null,
  alignment: initialAlignment,
  showLandmarks: true,
  showGrid: false,
  userFraming: DEFAULT_USER_FRAMING,
  backgroundSettings: defaultBackgroundSettings,
  isDetecting: false,
  error: null,

  // Actions
  setBeforePhoto: (photo) => set((state) => {
    revokeReplacedPhotoUrls(state.beforePhoto, photo);
    return { beforePhoto: photo };
  }),

  setAfterPhoto: (photo) => set((state) => {
    revokeReplacedPhotoUrls(state.afterPhoto, photo);
    return { afterPhoto: photo };
  }),

  setBeforeLandmarks: (landmarks) =>
    set((state) => ({
      beforePhoto: state.beforePhoto
        ? { ...state.beforePhoto, landmarks }
        : null,
    })),

  setAfterLandmarks: (landmarks) =>
    set((state) => ({
      afterPhoto: state.afterPhoto
        ? { ...state.afterPhoto, landmarks }
        : null,
    })),

  updateAlignment: (settings) =>
    set((state) => ({
      alignment: { ...state.alignment, ...settings },
    })),

  setBackgroundSettings: (settings) =>
    set({ backgroundSettings: settings }),

  toggleLandmarks: () =>
    set((state) => ({ showLandmarks: !state.showLandmarks })),

  toggleGrid: () =>
    set((state) => ({ showGrid: !state.showGrid })),

  setUserFraming: (partial) =>
    set((state) => ({
      userFraming: { ...state.userFraming, ...partial },
    })),

  resetUserFraming: () =>
    set({ userFraming: DEFAULT_USER_FRAMING }),

  setIsDetecting: (detecting) => set({ isDetecting: detecting }),

  setError: (error) => set({ error }),

  reset: () => set((state) => {
    revokePhotoUrls(state.beforePhoto);
    revokePhotoUrls(state.afterPhoto);
    return {
      beforePhoto: null,
      afterPhoto: null,
      alignment: initialAlignment,
      showLandmarks: true,
      showGrid: false,
      userFraming: DEFAULT_USER_FRAMING,
      backgroundSettings: defaultBackgroundSettings,
      isDetecting: false,
      error: null,
    };
  }),
}));
