'use client';

/**
 * PhotoPanel - Single photo display panel with landmark overlay
 * Used for before/after photos in the editor
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DropZone } from './DropZone';
import { LandmarkOverlay } from './LandmarkOverlay';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';
import type { Photo } from '@/types/editor';
import type { Landmark } from '@/types/landmarks';

interface PhotoPanelProps {
  label: string;
  photo: Photo | null;
  onPhotoChange: (photo: Photo | null) => void;
  onLandmarksDetected: (landmarks: Landmark[] | null) => void;
  showLandmarks: boolean;
  className?: string;
}

export function PhotoPanel({
  label,
  photo,
  onPhotoChange,
  onLandmarksDetected,
  showLandmarks,
  className,
}: PhotoPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const { detect, isDetecting, error: detectionError } = usePoseDetection();
  const {
    processImage: removeBackground,
    isProcessing: isRemovingBackground,
    progress: bgRemovalProgress,
    error: bgRemovalError,
  } = useBackgroundRemoval();


  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Detect landmarks when photo changes
  const handlePhotoLoad = useCallback(
    async (newPhoto: Photo) => {
      onPhotoChange(newPhoto);

      // Run pose detection
      const landmarks = await detect(newPhoto.dataUrl);
      onLandmarksDetected(landmarks);
    },
    [detect, onPhotoChange, onLandmarksDetected]
  );

  // Handle background removal
  const handleRemoveBackground = useCallback(async () => {
    if (!photo) return;

    const result = await removeBackground(photo.dataUrl);
    if (result) {
      // Update photo with background removed
      const updatedPhoto: Photo = {
        ...photo,
        dataUrl: result.processedDataUrl,
        hasBackgroundRemoved: true,
        originalDataUrl: photo.originalDataUrl || photo.dataUrl,
        segmentationMask: result.mask,
      };
      onPhotoChange(updatedPhoto);
    }
  }, [photo, removeBackground, onPhotoChange]);

  // Handle restoring original background
  const handleRestoreBackground = useCallback(() => {
    if (!photo || !photo.originalDataUrl) return;

    const restoredPhoto: Photo = {
      ...photo,
      dataUrl: photo.originalDataUrl,
      hasBackgroundRemoved: false,
      // Keep originalDataUrl and segmentationMask for potential re-removal
    };
    onPhotoChange(restoredPhoto);
  }, [photo, onPhotoChange]);

  // Calculate image display dimensions
  const getImageDisplaySize = () => {
    if (!photo || containerSize.width === 0) {
      return { width: 0, height: 0, scale: 1 };
    }

    const padding = 0;
    const availableWidth = containerSize.width - padding * 2;
    const availableHeight = containerSize.height - padding * 2;

    const scaleX = availableWidth / photo.width;
    const scaleY = availableHeight / photo.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

    return {
      width: photo.width * scale,
      height: photo.height * scale,
      scale,
    };
  };

  const displaySize = getImageDisplaySize();

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Panel Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <div className="flex items-center gap-2">
          {isDetecting && (
            <span className="text-xs text-text-secondary animate-pulse">
              Detecting pose...
            </span>
          )}
          {isRemovingBackground && (
            <span className="text-xs text-text-secondary animate-pulse">
              Removing background... {Math.round(bgRemovalProgress * 100)}%
            </span>
          )}
          {detectionError && (
            <span className="text-xs text-red-500">{detectionError}</span>
          )}
          {bgRemovalError && (
            <span className="text-xs text-red-500">{bgRemovalError}</span>
          )}
        </div>
      </div>

      {/* Photo Container */}
      <div
        ref={containerRef}
        className={cn(
          'relative flex-1 rounded-2xl overflow-hidden',
          'bg-surface-secondary border border-border-default',
          'min-h-[400px]'
        )}
      >
        {photo ? (
          <div className="absolute inset-0 flex items-center justify-center group">
            {/* Photo */}
            <div
              className="relative"
              style={{
                width: displaySize.width,
                height: displaySize.height,
              }}
            >
              {/* Checkerboard pattern for transparent backgrounds */}
              {photo.hasBackgroundRemoved && (
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #ccc 25%, transparent 25%),
                      linear-gradient(-45deg, #ccc 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #ccc 75%),
                      linear-gradient(-45deg, transparent 75%, #ccc 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  }}
                />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.dataUrl}
                alt={`${label} photo`}
                className="w-full h-full object-contain relative z-10"
              />

              {/* Landmark Overlay */}
              {photo.landmarks && (
                <LandmarkOverlay
                  landmarks={photo.landmarks}
                  width={displaySize.width}
                  height={displaySize.height}
                  visible={showLandmarks}
                  className="absolute inset-0 z-20"
                />
              )}

              {/* Background removal indicator */}
              {photo.hasBackgroundRemoved && (
                <div className="absolute top-3 left-3 z-30 px-2 py-1 rounded-lg bg-[var(--brand-purple)] text-white text-xs font-medium">
                  BG Removed
                </div>
              )}

              {/* Action buttons */}
              <div className="absolute top-3 right-3 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {/* Background removal button */}
                {!photo.hasBackgroundRemoved ? (
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBackground}
                    className={cn(
                      'p-2 rounded-lg',
                      'bg-[var(--brand-purple)]/90 hover:bg-[var(--brand-purple)] backdrop-blur-sm',
                      'text-white transition-colors duration-200',
                      isRemovingBackground && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label="Remove background"
                    title="Remove background"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleRestoreBackground}
                    className={cn(
                      'p-2 rounded-lg',
                      'bg-[var(--brand-orange)]/90 hover:bg-[var(--brand-orange)] backdrop-blur-sm',
                      'text-white transition-colors duration-200'
                    )}
                    aria-label="Restore background"
                    title="Restore original background"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                  </button>
                )}

                {/* Remove photo button */}
                <button
                  onClick={() => {
                    onPhotoChange(null);
                    onLandmarksDetected(null);
                  }}
                  className={cn(
                    'p-2 rounded-lg',
                    'bg-black/50 hover:bg-black/70 backdrop-blur-sm',
                    'text-white transition-colors duration-200'
                  )}
                  aria-label="Remove photo"
                  title="Remove photo"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Processing overlay */}
            {isRemovingBackground && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
                <div className="text-center text-white">
                  <div className="relative w-16 h-16 mb-4 mx-auto">
                    <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
                    <div
                      className="absolute inset-0 border-4 border-white rounded-full border-t-transparent animate-spin"
                      style={{
                        transform: `rotate(${bgRemovalProgress * 360}deg)`,
                      }}
                    ></div>
                  </div>
                  <p className="font-medium">Removing background...</p>
                  <p className="text-sm text-white/70 mt-1">
                    {Math.round(bgRemovalProgress * 100)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <DropZone
            label=""
            onImageLoad={handlePhotoLoad}
            photo={photo}
            className="absolute inset-0"
          />
        )}
      </div>
    </div>
  );
}
