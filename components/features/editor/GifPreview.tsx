/**
 * GIF Preview Component
 *
 * Canvas-based animation preview for GIF exports.
 * Uses the shared alignment algorithm from lib/canvas/aligned-draw-params.ts
 * for consistent preview that matches the actual GIF export.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AnimationStyle } from '@/lib/canvas/export-gif';
import type { Photo } from '@/types/editor';
import { calculateAlignedDrawParams } from '@/lib/canvas/aligned-draw-params';

export interface GifPreviewProps {
  beforePhoto: Photo;
  afterPhoto: Photo;
  animationStyle: AnimationStyle; // 'slider' | 'crossfade' | 'toggle'
  duration?: number; // Animation duration in seconds
  format: '1:1' | '4:5' | '9:16';
  className?: string;
  showLabels?: boolean;
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

/**
 * GIF Preview Component
 *
 * Displays an animated preview of the GIF export using canvas-based rendering.
 * Uses the same alignment algorithm as the actual GIF export.
 */
export function GifPreview({
  beforePhoto,
  afterPhoto,
  animationStyle,
  duration = 2,
  format,
  className,
  showLabels = false,
}: GifPreviewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const animationRef = React.useRef<number>(0);
  const [isReady, setIsReady] = React.useState(false);

  // Store pre-rendered frames
  const beforeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const afterCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const dimensionsRef = React.useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Pre-render aligned images
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width || 400;
    const containerHeight = containerRect.height || 300;

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
          targetWidth,
          targetHeight
        );

        // Create before canvas
        const beforeCanvas = document.createElement('canvas');
        beforeCanvas.width = targetWidth;
        beforeCanvas.height = targetHeight;
        const beforeCtx = beforeCanvas.getContext('2d');
        if (beforeCtx) {
          beforeCtx.fillStyle = '#ffffff';
          beforeCtx.fillRect(0, 0, targetWidth, targetHeight);
          beforeCtx.drawImage(
            beforeImg,
            alignParams.before.drawX,
            alignParams.before.drawY,
            alignParams.before.drawWidth,
            alignParams.before.drawHeight
          );
        }
        beforeCanvasRef.current = beforeCanvas;

        // Create after canvas
        const afterCanvas = document.createElement('canvas');
        afterCanvas.width = targetWidth;
        afterCanvas.height = targetHeight;
        const afterCtx = afterCanvas.getContext('2d');
        if (afterCtx) {
          afterCtx.fillStyle = '#ffffff';
          afterCtx.fillRect(0, 0, targetWidth, targetHeight);
          afterCtx.drawImage(
            afterImg,
            alignParams.after.drawX,
            alignParams.after.drawY,
            alignParams.after.drawWidth,
            alignParams.after.drawHeight
          );
        }
        afterCanvasRef.current = afterCanvas;

        dimensionsRef.current = { width: targetWidth, height: targetHeight };

        // Set main canvas size
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }

        setIsReady(true);
      })
      .catch((error) => {
        console.error('Failed to prepare GIF preview:', error);
      });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [beforePhoto, afterPhoto, format]);

  // Animation loop
  React.useEffect(() => {
    if (!isReady) return;

    const canvas = canvasRef.current;
    const beforeCanvas = beforeCanvasRef.current;
    const afterCanvas = afterCanvasRef.current;
    if (!canvas || !beforeCanvas || !afterCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;
    const durationMs = duration * 1000;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % durationMs) / durationMs;

      ctx.clearRect(0, 0, width, height);

      if (animationStyle === 'slider') {
        // Slider: wipe from left to right
        const clipX = width * progress;

        // Draw after image (revealed part)
        ctx.drawImage(afterCanvas, 0, 0);

        // Draw before image (unrevealed part)
        ctx.save();
        ctx.beginPath();
        ctx.rect(clipX, 0, width - clipX, height);
        ctx.clip();
        ctx.drawImage(beforeCanvas, 0, 0);
        ctx.restore();

        // Draw slider line
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillRect(clipX - 1, 0, 2, height);
        ctx.shadowBlur = 0;
      } else if (animationStyle === 'crossfade') {
        // Crossfade: smooth opacity transition
        const fadeProgress = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;

        ctx.globalAlpha = 1;
        ctx.drawImage(afterCanvas, 0, 0);
        ctx.globalAlpha = fadeProgress;
        ctx.drawImage(beforeCanvas, 0, 0);
        ctx.globalAlpha = 1;
      } else if (animationStyle === 'toggle') {
        // Toggle: snap between images
        if (progress < 0.5) {
          ctx.drawImage(beforeCanvas, 0, 0);
        } else {
          ctx.drawImage(afterCanvas, 0, 0);
        }
      }

      // Draw labels
      if (showLabels) {
        const fontSize = Math.round(width * 0.04);
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        const label = animationStyle === 'toggle'
          ? (progress < 0.5 ? 'Before' : 'After')
          : animationStyle === 'crossfade'
            ? (Math.sin(progress * Math.PI * 2) > 0 ? 'Before' : 'After')
            : null;

        if (label) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          const textWidth = ctx.measureText(label).width;
          ctx.fillRect(12, 12, textWidth + 16, fontSize + 12);
          ctx.fillStyle = 'white';
          ctx.fillText(label, 20, 18);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isReady, animationStyle, duration, showLabels]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg bg-[var(--gray-100)] w-full h-full flex items-center justify-center',
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ display: isReady ? 'block' : 'none' }}
      />
      {!isReady && (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-pink)]" />
        </div>
      )}
    </div>
  );
}
