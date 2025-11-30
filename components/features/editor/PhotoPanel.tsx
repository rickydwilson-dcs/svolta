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
import { useEditorStore } from '@/stores/editor-store';
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

  // Subscribe to alignment settings for "After" photo
  const alignment = useEditorStore((state) => state.alignment);
  const isAfterPhoto = label === 'After';

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
        {isDetecting && (
          <span className="text-xs text-text-secondary animate-pulse">
            Detecting pose...
          </span>
        )}
        {detectionError && (
          <span className="text-xs text-red-500">{detectionError}</span>
        )}
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
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Photo */}
            <div
              className="relative"
              style={{
                width: displaySize.width,
                height: displaySize.height,
              }}
            >
              <img
                src={photo.dataUrl}
                alt={`${label} photo`}
                className="w-full h-full object-contain"
                style={
                  isAfterPhoto
                    ? {
                        transform: `scale(${alignment.scale}) translate(${alignment.offsetX}px, ${alignment.offsetY}px)`,
                        transition: 'transform 0.1s ease-out',
                        transformOrigin: 'center center',
                      }
                    : undefined
                }
              />

              {/* Landmark Overlay */}
              {photo.landmarks && (
                <LandmarkOverlay
                  landmarks={photo.landmarks}
                  width={displaySize.width}
                  height={displaySize.height}
                  visible={showLandmarks}
                  className="absolute inset-0"
                  style={
                    isAfterPhoto
                      ? {
                          transform: `scale(${alignment.scale}) translate(${alignment.offsetX}px, ${alignment.offsetY}px)`,
                          transition: 'transform 0.1s ease-out',
                          transformOrigin: 'center center',
                        }
                      : undefined
                  }
                />
              )}

              {/* Remove/Replace button */}
              <button
                onClick={() => {
                  onPhotoChange(null);
                  onLandmarksDetected(null);
                }}
                className={cn(
                  'absolute top-3 right-3 p-2 rounded-lg',
                  'bg-black/50 hover:bg-black/70 backdrop-blur-sm',
                  'text-white transition-colors duration-200',
                  'opacity-0 hover:opacity-100 focus:opacity-100',
                  'group-hover:opacity-100'
                )}
                aria-label="Remove photo"
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
