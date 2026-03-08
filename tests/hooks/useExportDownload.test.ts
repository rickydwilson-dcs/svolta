/**
 * Tests for hooks/useExportDownload
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExportDownload } from '@/hooks/useExportDownload';

// Mutable flag for anonymous test scenarios
let mockIsAnonymous = false;

const mockExportAndDownload = vi.fn().mockResolvedValue(true);
const mockExportGifAndDownload = vi.fn().mockResolvedValue(true);
const mockCheckAndIncrement = vi.fn().mockResolvedValue(true);
const mockClearCanvasError = vi.fn();
const mockClearGifError = vi.fn();

vi.mock('@/hooks/useCanvasExport', () => ({
  useCanvasExport: () => ({
    isExporting: false,
    error: null,
    exportAndDownload: mockExportAndDownload,
    clearError: mockClearCanvasError,
  }),
}));

vi.mock('@/hooks/useGifExport', () => ({
  useGifExport: () => ({
    isExporting: false,
    progress: 0,
    status: 'idle',
    error: null,
    exportAndDownload: mockExportGifAndDownload,
    cancel: vi.fn(),
    clearError: mockClearGifError,
  }),
}));

vi.mock('@/hooks/useUsageLimit', () => ({
  useUsageLimit: () => ({
    checkAndIncrement: mockCheckAndIncrement,
    isAnonymous: mockIsAnonymous,
    limit: 5,
    remaining: 3,
    canExport: true,
    isPro: false,
    isLoading: false,
    error: null,
    used: 2,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/stores/editor-store', () => ({
  useEditorStore: (selector: (s: unknown) => unknown) => selector({
    beforePhoto: { dataUrl: 'data:before', hasBackgroundRemoved: false },
    afterPhoto: { dataUrl: 'data:after', hasBackgroundRemoved: false },
    alignment: {},
    backgroundSettings: { type: 'original' },
  }),
}));

vi.mock('@/stores/user-store', () => ({
  useUserStore: (selector: (s: unknown) => unknown) => selector({
    isPro: () => false,
    profile: null,
  }),
}));

vi.mock('@/lib/export-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/export-utils')>();
  return {
    ...actual,
    logExportEvent: vi.fn(),
  };
});

const defaultConfig = {
  exportType: 'png' as const,
  aspectRatio: '4:5' as const,
  animationStyle: 'slider' as const,
  duration: 2,
  addLabels: false,
  removeWatermark: true,
  addLogo: false,
  hasBackgroundRemoved: false,
};

describe('useExportDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAnonymous = false;
    mockCheckAndIncrement.mockResolvedValue(true);
    mockExportAndDownload.mockResolvedValue(true);
    mockExportGifAndDownload.mockResolvedValue(true);
  });

  it('calls exportAndDownload for PNG type', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useExportDownload(defaultConfig, { onLimitReached: vi.fn(), onSuccess })
    );

    await act(async () => {
      await result.current.handleDownload();
    });

    expect(mockExportAndDownload).toHaveBeenCalled();
    expect(mockExportGifAndDownload).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('calls exportGifAndDownload for GIF type', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useExportDownload(
        { ...defaultConfig, exportType: 'gif' },
        { onLimitReached: vi.fn(), onSuccess }
      )
    );

    await act(async () => {
      await result.current.handleDownload();
    });

    expect(mockExportGifAndDownload).toHaveBeenCalled();
    expect(mockExportAndDownload).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('calls onLimitReached with isAnonymous=false for logged-in free user', async () => {
    mockCheckAndIncrement.mockResolvedValue(false);
    mockIsAnonymous = false;
    const onLimitReached = vi.fn();

    const { result } = renderHook(() =>
      useExportDownload(defaultConfig, { onLimitReached, onSuccess: vi.fn() })
    );

    await act(async () => {
      await result.current.handleDownload();
    });

    expect(onLimitReached).toHaveBeenCalledWith(false);
    expect(mockExportAndDownload).not.toHaveBeenCalled();
  });

  it('calls onLimitReached with isAnonymous=true for anonymous user', async () => {
    mockCheckAndIncrement.mockResolvedValue(false);
    mockIsAnonymous = true;
    const onLimitReached = vi.fn();

    const { result } = renderHook(() =>
      useExportDownload(defaultConfig, { onLimitReached, onSuccess: vi.fn() })
    );

    await act(async () => {
      await result.current.handleDownload();
    });

    expect(onLimitReached).toHaveBeenCalledWith(true);
    expect(mockExportAndDownload).not.toHaveBeenCalled();
  });

  it('does not call download when checkAndIncrement returns false', async () => {
    mockCheckAndIncrement.mockResolvedValue(false);
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useExportDownload(defaultConfig, { onLimitReached: vi.fn(), onSuccess })
    );

    await act(async () => {
      await result.current.handleDownload();
    });

    expect(mockExportAndDownload).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
