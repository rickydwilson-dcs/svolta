'use client';

/**
 * AlignedPreview - Canvas-based preview showing auto-aligned before/after photos
 * Uses the shared alignment algorithm from lib/canvas/aligned-draw-params.ts
 * for WYSIWYG preview that matches PNG and GIF exports.
 */

import * as React from 'react';
import { editorLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import type { Photo } from '@/types/editor';
import type { BackgroundSettings } from '@/lib/segmentation/backgrounds';
import { calculateAlignedDrawParams } from '@/lib/canvas/aligned-draw-params';
import { loadImage } from '@/lib/canvas/load-image';
import { useEditorStore } from '@/stores/editor-store';

export interface AlignedPreviewProps {
  beforePhoto: Photo;
  afterPhoto: Photo;
  format: '1:1' | '4:5' | '9:16';
  showLabels?: boolean;
  backgroundSettings?: BackgroundSettings;
  className?: string;
}

/**
 * Get total canvas aspect ratio (width/height) for side-by-side layout.
 * Must match export.ts calculateDimensions(), where format applies to
 * the full exported canvas.
 */
function getAspectRatio(format: '1:1' | '4:5' | '9:16'): number {
  switch (format) {
    case '1:1':
      return 1.0;
    case '4:5':
      return 4 / 5;
    case '9:16':
      return 9 / 16;
    default:
      return 1.0;
  }
}

export function AlignedPreview({
  beforePhoto,
  afterPhoto,
  format,
  showLabels = false,
  backgroundSettings,
  className,
}: AlignedPreviewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [imagesLoading, setImagesLoading] = React.useState(true);
  const userFraming = useEditorStore((state) => state.userFraming);

  const imagesRef = React.useRef<{
    beforeImg: HTMLImageElement | null;
    afterImg: HTMLImageElement | null;
    beforeDataUrl: string | null;
    afterDataUrl: string | null;
  }>({ beforeImg: null, afterImg: null, beforeDataUrl: null, afterDataUrl: null });

  const [imagesLoaded, setImagesLoaded] = React.useState(0);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });

  // Track container size changes (handles dialog open animation)
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width > 0 && height > 0) {
        setContainerSize((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height }
        );
      }
    };

    // Seed initial size to avoid waiting for ResizeObserver callbacks.
    updateSize();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setContainerSize((prev) =>
          prev.width === Math.round(width) && prev.height === Math.round(height)
            ? prev
            : { width: Math.round(width), height: Math.round(height) }
        );
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Effect 1: Load images when data URLs change
  React.useEffect(() => {
    let cancelled = false;

    const before = beforePhoto.dataUrl;
    const after = afterPhoto.dataUrl;

    if (
      imagesRef.current.beforeDataUrl === before &&
      imagesRef.current.afterDataUrl === after &&
      imagesRef.current.beforeImg &&
      imagesRef.current.afterImg
    ) {
      return;
    }

    setImagesLoading(true);

    Promise.all([loadImage(before), loadImage(after)])
      .then(([beforeImg, afterImg]) => {
        if (cancelled) return;
        imagesRef.current = {
          beforeImg,
          afterImg,
          beforeDataUrl: before,
          afterDataUrl: after,
        };
        setImagesLoaded((n) => n + 1);
        setImagesLoading(false);
      })
      .catch((error) => {
        if (!cancelled) {
          editorLogger.error('Failed to load aligned preview images:', error);
          setImagesLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [beforePhoto.dataUrl, afterPhoto.dataUrl]);

  // Effect 2: Draw canvas (runs when images are ready or visual params change)
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const { beforeImg, afterImg } = imagesRef.current;
    if (!canvas || !beforeImg || !afterImg) return;
    if (containerSize.width === 0 || containerSize.height === 0) return;

    const rafId = requestAnimationFrame(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get container dimensions from ResizeObserver
    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;

    // Calculate target dimensions based on format
    const aspectRatio = getAspectRatio(format);
    let targetWidth: number;
    let targetHeight: number;

    if (containerWidth / containerHeight > aspectRatio) {
      targetHeight = containerHeight;
      targetWidth = targetHeight * aspectRatio;
    } else {
      targetWidth = containerWidth;
      targetHeight = targetWidth / aspectRatio;
    }

    const halfWidth = targetWidth / 2;

    // Set canvas size
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Determine background colour based on settings
    const getBackgroundColour = (): string | null => {
      if (!backgroundSettings) return '#ffffff';
      if (backgroundSettings.type === 'solid' && backgroundSettings.color) {
        return backgroundSettings.color;
      }
      if (backgroundSettings.type === 'transparent') {
        return null; // Transparent - no fill
      }
      return '#ffffff'; // Default white
    };

    const bgColour = getBackgroundColour();

    // Clear canvas with background
    if (bgColour) {
      ctx.fillStyle = bgColour;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    } else {
      ctx.clearRect(0, 0, targetWidth, targetHeight);
    }

    // Calculate aligned draw parameters using the shared function
    const alignParams = calculateAlignedDrawParams(
      { width: beforeImg.width, height: beforeImg.height },
      { width: afterImg.width, height: afterImg.height },
      beforePhoto.landmarks,
      afterPhoto.landmarks,
      halfWidth,
      targetHeight,
      userFraming
    );

    // Keep canvas at target dimensions (exact ratio)
    const finalHalfWidth = halfWidth;

    // Draw before photo (left half)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, finalHalfWidth, targetHeight);
    ctx.clip();
    ctx.drawImage(
      beforeImg,
      alignParams.before.drawX,
      alignParams.before.drawY,
      alignParams.before.drawWidth,
      alignParams.before.drawHeight
    );
    ctx.restore();

    // Draw after photo (right half)
    ctx.save();
    ctx.beginPath();
    ctx.rect(finalHalfWidth, 0, finalHalfWidth, targetHeight);
    ctx.clip();
    ctx.drawImage(
      afterImg,
      finalHalfWidth + alignParams.after.drawX,
      alignParams.after.drawY,
      alignParams.after.drawWidth,
      alignParams.after.drawHeight
    );
    ctx.restore();

    // Draw labels if requested
    if (showLabels) {
      const fontSize = Math.round(finalHalfWidth * 0.04);
      const padding = Math.round(fontSize * 1.5);

      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';

      ctx.fillText('Before', finalHalfWidth / 2, padding);
      ctx.fillText('After', finalHalfWidth + finalHalfWidth / 2, padding);
    }

    });

    return () => cancelAnimationFrame(rafId);
  }, [imagesLoaded, format, showLabels, backgroundSettings, userFraming, beforePhoto.landmarks, afterPhoto.landmarks, containerSize]);

  return (
    <div ref={containerRef} className={cn('flex items-center justify-center', className)}>
      <canvas
        role="img"
        aria-label="Aligned before and after photo preview"
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ display: 'block' }}
      />
      {imagesLoading && (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-pink)]" />
        </div>
      )}
    </div>
  );
}
