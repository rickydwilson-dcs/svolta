'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { GifPreview } from '../GifPreview';
import { AlignedPreview } from '../AlignedPreview';
import { SvoltaLogo } from '@/components/ui/SvoltaLogo';
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

  return (
    <div className="p-4">
      <div
        className={cn(
          'relative rounded-xl overflow-hidden mx-auto',
          'bg-[var(--gray-100)]',
          'w-full min-h-[280px]'
        )}
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

            {/* Watermark (Free users only) */}
            {(!isPro || !removeWatermark) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="px-6 py-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
                  <SvoltaLogo size={48} mode="light" showWordmark wordmarkStyle="gradient" />
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

        {/* Aspect ratio badge - bottom right */}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
          {aspectRatio}
        </div>
      </div>
    </div>
  );
}
