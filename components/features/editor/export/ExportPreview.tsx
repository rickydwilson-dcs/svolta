'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { GifPreview } from '../GifPreview';
import { AlignedPreview } from '../AlignedPreview';
import { useZoomPanGestures } from '@/hooks/useZoomPanGestures';
import { useEditorStore } from '@/stores/editor-store';
import { DEFAULT_USER_FRAMING } from '@/types/editor';
import type { Photo } from '@/types/editor';
import type { AnimationStyle } from '@/lib/canvas/export-gif';
import type { BackgroundSettings } from '@/lib/segmentation/backgrounds';
import type { ExportType, AspectRatio } from '@/lib/export-utils';

interface ExportPreviewProps {
  exportType: ExportType;
  aspectRatio: AspectRatio;
  isPro: boolean;
  removeWatermark: boolean;
  addLabels: boolean;
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;
  animationStyle: AnimationStyle;
  duration: number;
  hasBackgroundRemoved: boolean | undefined;
  backgroundSettings: BackgroundSettings;
}

export function ExportPreview({
  exportType,
  aspectRatio,
  isPro,
  removeWatermark,
  addLabels,
  beforePhoto,
  afterPhoto,
  animationStyle,
  duration,
  hasBackgroundRemoved,
  backgroundSettings,
}: ExportPreviewProps) {
  const hasPhotos = Boolean(beforePhoto && afterPhoto);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const userFraming = useEditorStore((state) => state.userFraming);
  const setUserFraming = useEditorStore((state) => state.setUserFraming);
  const resetUserFraming = useEditorStore((state) => state.resetUserFraming);
  const [isDragging, setIsDragging] = React.useState(false);

  useZoomPanGestures(containerRef, {
    onZoomChange: (newZoom) => setUserFraming({ zoom: newZoom }),
    onPanChange: (newPanX, newPanY) => {
      setIsDragging(true);
      setUserFraming({ panX: newPanX, panY: newPanY });
      setTimeout(() => setIsDragging(false), 150);
    },
    getCurrentState: () => userFraming,
    enabled: hasPhotos,
  });

  const hasFramingChanged =
    userFraming.zoom !== DEFAULT_USER_FRAMING.zoom ||
    userFraming.panX !== DEFAULT_USER_FRAMING.panX ||
    userFraming.panY !== DEFAULT_USER_FRAMING.panY;

  return (
    <div className="p-4">
      <div
        ref={containerRef}
        className={cn(
          'relative rounded-xl overflow-hidden mx-auto',
          'bg-[var(--gray-100)]',
          'w-full h-[280px]'
        )}
        style={{
          cursor: hasPhotos
            ? isDragging
              ? 'grabbing'
              : userFraming.zoom > 1
                ? 'grab'
                : 'zoom-in'
            : 'default',
        }}
        role={hasPhotos ? 'application' : undefined}
        aria-label={hasPhotos ? 'Export preview — pinch or scroll to zoom, drag to pan' : undefined}
      >
        {hasPhotos && beforePhoto && afterPhoto ? (
          <>
            {exportType === 'gif' && isPro ? (
              <GifPreview
                beforePhoto={beforePhoto}
                afterPhoto={afterPhoto}
                animationStyle={animationStyle}
                duration={duration}
                showLabels={addLabels}
                format={aspectRatio}
                className="absolute inset-0"
              />
            ) : (
              <AlignedPreview
                beforePhoto={beforePhoto}
                afterPhoto={afterPhoto}
                format={aspectRatio}
                showLabels={addLabels}
                backgroundSettings={hasBackgroundRemoved ? backgroundSettings : undefined}
                className="absolute inset-0"
              />
            )}

            {/* Watermark (Free users only) — diagonal repeating brand text */}
            {(!isPro || !removeWatermark) && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(-25deg, transparent, transparent 120px, rgba(0,0,0,0) 120px)',
                }}
              >
                <div
                  className="absolute inset-[-50%] flex flex-wrap items-center justify-center gap-x-16 gap-y-10"
                  style={{
                    transform: 'rotate(-25deg)',
                  }}
                >
                  {Array.from({ length: 40 }).map((_, i) => (
                    <span
                      key={i}
                      className="text-lg font-medium select-none"
                      style={{
                        background: 'linear-gradient(90deg, #F58529, #DD2A7B, #8134AF, #515BD4)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        opacity: 0.45,
                        textShadow: 'none',
                      }}
                    >
                      svolta
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--text-secondary)] text-sm">
              Load photos to see preview
            </p>
          </div>
        )}

        {/* Export type badge - top left */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-instagram-gradient text-white text-xs font-medium">
          {exportType.toUpperCase()}
        </div>

        {/* Reset framing button - top right */}
        {hasFramingChanged && (
          <button
            type="button"
            onClick={resetUserFraming}
            className={cn(
              'absolute top-3 right-3 p-1.5 rounded-md',
              'bg-black/60 text-white backdrop-blur-sm',
              'hover:bg-black/80 transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
            )}
            aria-label="Reset zoom and pan"
            title="Reset zoom and pan"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 1 3 6.5" />
              <path d="M3 20v-8h8" />
            </svg>
          </button>
        )}

        {/* Aspect ratio badge - bottom left */}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
          {aspectRatio}
        </div>
      </div>
    </div>
  );
}
