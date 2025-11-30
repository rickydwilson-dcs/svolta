/**
 * Editor State Management with Zustand
 * Manages photos, landmarks, alignment settings, and editor UI state
 */

import { create } from 'zustand';
import type { Photo, AlignmentSettings } from '@/types/editor';
import type { Landmark } from '@/types/landmarks';

interface EditorState {
  // Photos
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;

  // Settings
  alignment: AlignmentSettings;
  showLandmarks: boolean;
  showGrid: boolean;
  linkedZoom: boolean;

  // Status
  isDetecting: boolean;
  error: string | null;

  // Actions
  setBeforePhoto: (photo: Photo | null) => void;
  setAfterPhoto: (photo: Photo | null) => void;
  setBeforeLandmarks: (landmarks: Landmark[] | null) => void;
  setAfterLandmarks: (landmarks: Landmark[] | null) => void;
  updateAlignment: (settings: Partial<AlignmentSettings>) => void;
  toggleLandmarks: () => void;
  toggleGrid: () => void;
  toggleLinkedZoom: () => void;
  setIsDetecting: (detecting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialAlignment: AlignmentSettings = {
  anchor: 'shoulders',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export const useEditorStore = create<EditorState>((set) => ({
  // Initial state
  beforePhoto: null,
  afterPhoto: null,
  alignment: initialAlignment,
  showLandmarks: true,
  showGrid: false,
  linkedZoom: true,
  isDetecting: false,
  error: null,

  // Actions
  setBeforePhoto: (photo) => set({ beforePhoto: photo }),

  setAfterPhoto: (photo) => set({ afterPhoto: photo }),

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

  toggleLandmarks: () =>
    set((state) => ({ showLandmarks: !state.showLandmarks })),

  toggleGrid: () =>
    set((state) => ({ showGrid: !state.showGrid })),

  toggleLinkedZoom: () =>
    set((state) => ({ linkedZoom: !state.linkedZoom })),

  setIsDetecting: (detecting) => set({ isDetecting: detecting }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      beforePhoto: null,
      afterPhoto: null,
      alignment: initialAlignment,
      showLandmarks: true,
      showGrid: false,
      linkedZoom: true,
      isDetecting: false,
      error: null,
    }),
}));
