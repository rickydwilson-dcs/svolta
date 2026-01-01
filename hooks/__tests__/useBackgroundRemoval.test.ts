/**
 * Tests for useBackgroundRemoval hook
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useBackgroundRemoval } from '../useBackgroundRemoval';
import * as backgroundRemoval from '@/lib/segmentation/background-removal';

// Mock ImageData for Node environment
class MockImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

// Polyfill ImageData if not available
if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as unknown as { ImageData: typeof MockImageData }).ImageData = MockImageData;
}

// Mock the background removal library
vi.mock('@/lib/segmentation/background-removal', () => ({
  removeBackground: vi.fn(),
  applyBackground: vi.fn(),
}));

describe('useBackgroundRemoval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useBackgroundRemoval());

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBe(null);
  });

  it('should process image and return segmentation result', async () => {
    const mockResult = {
      mask: new ImageData(100, 100),
      processedDataUrl: 'data:image/png;base64,mock',
      width: 100,
      height: 100,
    };

    (backgroundRemoval.removeBackground as Mock).mockResolvedValue(mockResult);

    const { result } = renderHook(() => useBackgroundRemoval());

    let segmentationResult;
    await act(async () => {
      segmentationResult = await result.current.processImage('data:image/png;base64,test');
    });

    expect(backgroundRemoval.removeBackground).toHaveBeenCalledWith(
      'data:image/png;base64,test',
      expect.objectContaining({
        onProgress: expect.any(Function),
        threshold: 0.5,
      })
    );

    expect(segmentationResult).toEqual(mockResult);
    expect(result.current.isProcessing).toBe(false);
  });

  it('should handle errors during processing', async () => {
    const mockError = new Error('Processing failed');
    (backgroundRemoval.removeBackground as Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useBackgroundRemoval());

    let segmentationResult;
    await act(async () => {
      segmentationResult = await result.current.processImage('data:image/png;base64,test');
    });

    expect(segmentationResult).toBe(null);
    expect(result.current.error).toBe('Processing failed');
    expect(result.current.isProcessing).toBe(false);
  });

  it('should change background using existing mask', async () => {
    const mockMask = new ImageData(100, 100);
    const mockResult = 'data:image/png;base64,newbg';

    (backgroundRemoval.applyBackground as Mock).mockResolvedValue(mockResult);

    const { result } = renderHook(() => useBackgroundRemoval());

    let newDataUrl;
    await act(async () => {
      newDataUrl = await result.current.changeBackground(
        'data:image/png;base64,original',
        mockMask,
        { type: 'solid', color: '#ffffff' }
      );
    });

    expect(backgroundRemoval.applyBackground).toHaveBeenCalledWith(
      'data:image/png;base64,original',
      mockMask,
      { type: 'solid', color: '#ffffff' }
    );

    expect(newDataUrl).toBe(mockResult);
    expect(result.current.isProcessing).toBe(false);
  });

  it('should clear error state', async () => {
    const mockError = new Error('Test error');
    (backgroundRemoval.removeBackground as Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useBackgroundRemoval());

    // Trigger error
    await act(async () => {
      await result.current.processImage('data:image/png;base64,test');
    });

    expect(result.current.error).toBe('Test error');

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });
});
