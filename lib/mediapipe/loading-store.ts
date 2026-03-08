/**
 * MediaPipe Loading Store
 *
 * Domain-specific Zustand store for MediaPipe pose detector loading state.
 * Intentionally co-located with the MediaPipe module rather than in `stores/`
 * (which holds global app stores). This store is scoped to the MediaPipe
 * initialization lifecycle and is consumed exclusively within this module.
 */
import { create } from 'zustand';

interface MediaPipeLoadingState {
  isLoading: boolean;
  progress: number;
  error: string | null;
  setLoading: (isLoading: boolean) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
}

export const useMediaPipeLoading = create<MediaPipeLoadingState>((set) => ({
  isLoading: false,
  progress: 0,
  error: null,
  setLoading: (isLoading) => set({ isLoading }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error, isLoading: false }),
}));
