'use client';

/**
 * AlignedPreview - Canvas-based preview showing auto-aligned before/after photos
 * Uses the shared alignment algorithm from lib/canvas/aligned-draw-params.ts
 * for WYSIWYG preview that matches PNG and GIF exports.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Photo } from '@/types/editor';
import type { BackgroundSettings } from '@/lib/segmentation/backgrounds';
import { calculateAlignedDrawParams } from '@/lib/canvas/aligned-draw-params';

export interface AlignedPreviewProps {
  beforePhoto: Photo;
  afterPhoto: Photo;
  format: '1:1' | '4:5' | '9:16';
  showLabels?: boolean;
  backgroundSettings?: BackgroundSettings;
  className?: string;
}

/**
 * Get aspect ratio (width/height) for a given format
 */
function getAspectRatio(format: '1:1' | '4:5' | '9:16'): number {
  switch (format) {
    case '1:1':
      return 1.0;
    case '4:5':
      return 0.8;
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
  const [isRendering, setIsRendering] = React.useState(false);

  // Render the aligned preview
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Calculate target dimensions based on format
    const aspectRatio = getAspectRatio(format);
    let targetWidth: number;
    let targetHeight: number;

    // Fit to container while maintaining aspect ratio
    // For side-by-side, total width is 2x the single panel width
    const singlePanelAspect = aspectRatio;
    const sideBySideAspect = singlePanelAspect * 2;

    if (containerWidth / containerHeight > sideBySideAspect) {
      // Container is wider - fit to height
      targetHeight = containerHeight;
      targetWidth = targetHeight * sideBySideAspect;
    } else {
      // Container is taller - fit to width
      targetWidth = containerWidth;
      targetHeight = targetWidth / sideBySideAspect;
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

    // Load images
    const loadImage = (dataUrl: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
      });
    };

    Promise.all([
      loadImage(beforePhoto.dataUrl),
      loadImage(afterPhoto.dataUrl),
    ])
      .then(([beforeImg, afterImg]) => {
        // Calculate aligned draw parameters using the shared function
        const alignParams = calculateAlignedDrawParams(
          { width: beforeImg.width, height: beforeImg.height },
          { width: afterImg.width, height: afterImg.height },
          beforePhoto.landmarks,
          afterPhoto.landmarks,
          halfWidth,
          targetHeight
        );

        // Calculate visible height (crop to shortest image bottom)
        const beforeBottom = alignParams.before.drawY + alignParams.before.drawHeight;
        const afterBottom = alignParams.after.drawY + alignParams.after.drawHeight;
        const visibleHeight = Math.min(beforeBottom, afterBottom, targetHeight);

        // Calculate final dimensions maintaining aspect ratio
        const finalHalfWidth = visibleHeight * aspectRatio;
        const finalWidth = finalHalfWidth * 2;
        const finalHeight = visibleHeight;

        // Resize canvas to final dimensions
        canvas.width = finalWidth;
        canvas.height = finalHeight;

        // Clear with background colour
        if (bgColour) {
          ctx.fillStyle = bgColour;
          ctx.fillRect(0, 0, finalWidth, finalHeight);
        } else {
          ctx.clearRect(0, 0, finalWidth, finalHeight);
        }

        // Calculate width trim
        const widthTrimPerSide = (halfWidth - finalHalfWidth) / 2;

        const beforeAdjustedParams = {
          ...alignParams.before,
          drawX: alignParams.before.drawX - widthTrimPerSide,
        };
        const afterAdjustedParams = {
          ...alignParams.after,
          drawX: alignParams.after.drawX - widthTrimPerSide,
        };

        // Draw before photo (left half)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, finalHalfWidth, finalHeight);
        ctx.clip();
        ctx.drawImage(
          beforeImg,
          beforeAdjustedParams.drawX,
          beforeAdjustedParams.drawY,
          beforeAdjustedParams.drawWidth,
          beforeAdjustedParams.drawHeight
        );
        ctx.restore();

        // Draw after photo (right half)
        ctx.save();
        ctx.beginPath();
        ctx.rect(finalHalfWidth, 0, finalHalfWidth, finalHeight);
        ctx.clip();
        ctx.drawImage(
          afterImg,
          finalHalfWidth + afterAdjustedParams.drawX,
          afterAdjustedParams.drawY,
          afterAdjustedParams.drawWidth,
          afterAdjustedParams.drawHeight
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

        setIsRendering(false);
      })
      .catch((error) => {
        console.error('Failed to render aligned preview:', error);
        setIsRendering(false);
      });
  }, [beforePhoto, afterPhoto, format, showLabels, backgroundSettings]);

  return (
    <div ref={containerRef} className={cn('flex items-center justify-center', className)}>
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ display: isRendering ? 'none' : 'block' }}
      />
      {isRendering && (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-pink)]" />
        </div>
      )}
    </div>
  );
}
