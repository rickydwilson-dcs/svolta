/**
 * GIF Preview Component
 *
 * Canvas-based animation preview for GIF exports.
 * Uses aligned images like the PNG export for consistent preview.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AnimationStyle } from '@/lib/canvas/export-gif';
import type { Photo } from '@/types/editor';
import type { Landmark } from '@/types/landmarks';

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
 * Calculate how an image would be drawn to cover a target area
 */
function calculateCoverFit(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): { drawX: number; drawY: number; drawWidth: number; drawHeight: number } {
  const imgAspect = imgWidth / imgHeight;
  const targetAspect = targetWidth / targetHeight;

  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;

  if (imgAspect > targetAspect) {
    drawHeight = targetHeight;
    drawWidth = targetHeight * imgAspect;
    drawX = (targetWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = targetWidth;
    drawHeight = targetWidth / imgAspect;
    drawX = 0;
    drawY = (targetHeight - drawHeight) / 2;
  }

  return { drawX, drawY, drawWidth, drawHeight };
}

/**
 * Get shoulder center Y position from landmarks
 */
function getShoulderCenterY(
  landmarks: Landmark[] | undefined | null,
  visibilityThreshold: number = 0.5
): number | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const hasLeft = (leftShoulder?.visibility ?? 0) >= visibilityThreshold;
  const hasRight = (rightShoulder?.visibility ?? 0) >= visibilityThreshold;

  if (hasLeft && hasRight) {
    return (leftShoulder.y + rightShoulder.y) / 2;
  } else if (hasLeft) {
    return leftShoulder.y;
  } else if (hasRight) {
    return rightShoulder.y;
  }
  return null;
}

/**
 * Get hip center Y position from landmarks
 */
function getHipCenterY(
  landmarks: Landmark[] | undefined | null,
  visibilityThreshold: number = 0.5
): number | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const hasLeft = (leftHip?.visibility ?? 0) >= visibilityThreshold;
  const hasRight = (rightHip?.visibility ?? 0) >= visibilityThreshold;

  if (hasLeft && hasRight) {
    return (leftHip.y + rightHip.y) / 2;
  } else if (hasLeft) {
    return leftHip.y;
  } else if (hasRight) {
    return rightHip.y;
  }
  return null;
}

/**
 * Get shoulder-to-hip height from landmarks
 */
function getShoulderToHipHeight(
  landmarks: Landmark[] | undefined | null,
  visibilityThreshold: number = 0.5
): number {
  const shoulderY = getShoulderCenterY(landmarks, visibilityThreshold);
  const hipY = getHipCenterY(landmarks, visibilityThreshold);

  if (shoulderY !== null && hipY !== null) {
    return Math.abs(hipY - shoulderY);
  }
  return 0.35;
}

/**
 * Get normalized body height from landmarks
 */
function getBodyHeight(landmarks: Landmark[] | undefined | null): number {
  if (!landmarks || landmarks.length < 33) return 0.5;

  const VISIBILITY_THRESHOLD = 0.5;
  const HEAD_CROPPED_THRESHOLD = 0.02;
  const nose = landmarks[0];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const hasNose = (nose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const noseIsCropped = nose && nose.y < HEAD_CROPPED_THRESHOLD;
  const hasLeftHip = (leftHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hasRightHip = (rightHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  if (!hasNose || noseIsCropped) {
    return getShoulderToHipHeight(landmarks, VISIBILITY_THRESHOLD);
  }

  let hipY: number;
  if (hasLeftHip && hasRightHip) {
    hipY = (leftHip.y + rightHip.y) / 2;
  } else if (hasLeftHip) {
    hipY = leftHip.y;
  } else if (hasRightHip) {
    hipY = rightHip.y;
  } else {
    return 0.5;
  }

  return Math.abs(hipY - nose.y);
}

/**
 * Calculate aligned draw parameters for both images
 */
function calculateAlignedDrawParams(
  beforeImg: { width: number; height: number },
  afterImg: { width: number; height: number },
  beforeLandmarks: Landmark[] | undefined | null,
  afterLandmarks: Landmark[] | undefined | null,
  targetWidth: number,
  targetHeight: number
): {
  before: { drawX: number; drawY: number; drawWidth: number; drawHeight: number };
  after: { drawX: number; drawY: number; drawWidth: number; drawHeight: number };
} {
  const VISIBILITY_THRESHOLD = 0.5;
  const HEAD_CROPPED_THRESHOLD = 0.02;

  const beforeNose = beforeLandmarks?.[0];
  const afterNose = afterLandmarks?.[0];
  const beforeNoseVisible = (beforeNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const afterNoseVisible = (afterNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  const beforeHeadCropped = !beforeNoseVisible || (beforeNose && beforeNose.y < HEAD_CROPPED_THRESHOLD);
  const afterHeadCropped = !afterNoseVisible || (afterNose && afterNose.y < HEAD_CROPPED_THRESHOLD);
  const useShoulderAlignment = beforeHeadCropped || afterHeadCropped;

  let beforeAnchorY: number;
  let afterAnchorY: number;

  if (useShoulderAlignment) {
    const beforeShoulderY = getShoulderCenterY(beforeLandmarks, VISIBILITY_THRESHOLD);
    const afterShoulderY = getShoulderCenterY(afterLandmarks, VISIBILITY_THRESHOLD);
    beforeAnchorY = beforeShoulderY ?? 0.25;
    afterAnchorY = afterShoulderY ?? 0.25;
  } else {
    beforeAnchorY = beforeNose!.y;
    afterAnchorY = afterNose!.y;
  }

  const beforeHeadY = beforeAnchorY;
  const afterHeadY = afterAnchorY;

  // Phase 1: Body scaling
  const beforeBodyH = getBodyHeight(beforeLandmarks);
  const afterBodyH = getBodyHeight(afterLandmarks);
  let bodyScale = afterBodyH > 0 ? beforeBodyH / afterBodyH : 1;
  bodyScale = Math.max(0.8, Math.min(1.25, bodyScale));

  // Phase 2: Cover fit + overflow normalization
  const beforeFit = calculateCoverFit(beforeImg.width, beforeImg.height, targetWidth, targetHeight);
  const afterFit = calculateCoverFit(afterImg.width, afterImg.height, targetWidth, targetHeight);

  const beforeOverflow = beforeFit.drawHeight / targetHeight;
  const afterOverflow = afterFit.drawHeight / targetHeight;
  const targetOverflow = Math.max(beforeOverflow, afterOverflow, 1.15);

  let beforeScale = 1;
  let afterScale = 1;

  if (beforeOverflow < targetOverflow) {
    beforeScale = targetOverflow / beforeOverflow;
  }
  if (afterOverflow < targetOverflow) {
    afterScale = targetOverflow / afterOverflow;
  }

  const beforeScaledWidth = beforeFit.drawWidth * beforeScale;
  const beforeScaledHeight = beforeFit.drawHeight * beforeScale;
  const afterScaledWidth = afterFit.drawWidth * afterScale * bodyScale;
  const afterScaledHeight = afterFit.drawHeight * afterScale * bodyScale;

  const beforeHeadAtTop = beforeHeadY * beforeScaledHeight;
  const afterHeadAtTop = afterHeadY * afterScaledHeight;

  const constraintHeadPixelY = Math.min(beforeHeadAtTop, afterHeadAtTop);
  const minHeadY = targetHeight * 0.05;
  const maxHeadY = targetHeight * 0.20;
  const targetHeadPixelY = Math.max(minHeadY, Math.min(maxHeadY, constraintHeadPixelY));

  // Phase 3: Position
  let beforeDrawY = targetHeadPixelY - beforeHeadAtTop;
  let afterDrawY = targetHeadPixelY - afterHeadAtTop;

  if (useShoulderAlignment) {
    const beforeTopCrop = Math.abs(Math.min(0, beforeDrawY));
    const afterTopCrop = Math.abs(Math.min(0, afterDrawY));
    const maxTopCrop = Math.max(beforeTopCrop, afterTopCrop);

    if (beforeTopCrop < maxTopCrop) {
      beforeDrawY -= maxTopCrop - beforeTopCrop;
    }
    if (afterTopCrop < maxTopCrop) {
      afterDrawY -= maxTopCrop - afterTopCrop;
    }
  } else {
    const headPixelOnCanvas = beforeDrawY + beforeHeadY * beforeScaledHeight;
    const minHeadOnCanvas = targetHeight * 0.05;
    if (headPixelOnCanvas < minHeadOnCanvas) {
      beforeDrawY = minHeadOnCanvas - beforeHeadY * beforeScaledHeight;
    }
    beforeDrawY = Math.min(0, beforeDrawY);

    const afterHeadPixelOnCanvas = afterDrawY + afterHeadY * afterScaledHeight;
    if (afterHeadPixelOnCanvas < minHeadOnCanvas) {
      afterDrawY = minHeadOnCanvas - afterHeadY * afterScaledHeight;
    }
    afterDrawY = Math.min(0, afterDrawY);
  }

  const beforeDrawX = (targetWidth - beforeScaledWidth) / 2;
  const afterDrawX = (targetWidth - afterScaledWidth) / 2;

  return {
    before: {
      drawX: beforeDrawX,
      drawY: beforeDrawY,
      drawWidth: beforeScaledWidth,
      drawHeight: beforeScaledHeight,
    },
    after: {
      drawX: afterDrawX,
      drawY: afterDrawY,
      drawWidth: afterScaledWidth,
      drawHeight: afterScaledHeight,
    },
  };
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
        // Calculate aligned draw parameters
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
