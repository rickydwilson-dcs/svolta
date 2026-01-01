'use client';

/**
 * AlignedPreview - Canvas-based preview showing auto-aligned before/after photos
 * Uses the same alignment algorithm as the export function for WYSIWYG preview
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Photo } from '@/types/editor';
import type { Landmark } from '@/types/landmarks';

export interface AlignedPreviewProps {
  beforePhoto: Photo;
  afterPhoto: Photo;
  format: '1:1' | '4:5' | '9:16';
  showLabels?: boolean;
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
    // Smart clamp for head visibility
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

export function AlignedPreview({
  beforePhoto,
  afterPhoto,
  format,
  showLabels = false,
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

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

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

        // Clear with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalWidth, finalHeight);

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
  }, [beforePhoto, afterPhoto, format, showLabels]);

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
