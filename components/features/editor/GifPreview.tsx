/**
 * GIF Preview Component
 *
 * Lightweight CSS-based animation preview for GIF exports.
 * Approximates the final GIF appearance using pure CSS animations.
 * Does NOT encode actual GIF - only visual preview.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AnimationStyle } from '@/lib/canvas/export-gif';

export interface GifPreviewProps {
  beforeImageUrl: string;
  afterImageUrl: string;
  animationStyle: AnimationStyle; // 'slider' | 'crossfade' | 'toggle'
  duration?: number; // Animation duration in seconds
  className?: string;
  showLabels?: boolean;
}

/**
 * GIF Preview Component
 *
 * Displays an animated preview of the GIF export using CSS animations.
 * This is a lightweight approximation - the actual GIF will be generated
 * by the export function with proper alignment and watermarks.
 *
 * @example
 * ```tsx
 * <GifPreview
 *   beforeImageUrl={beforePhoto.dataUrl}
 *   afterImageUrl={afterPhoto.dataUrl}
 *   animationStyle="slider"
 *   duration={2}
 *   showLabels={true}
 * />
 * ```
 */
export function GifPreview({
  beforeImageUrl,
  afterImageUrl,
  animationStyle,
  duration = 2,
  className,
  showLabels = false,
}: GifPreviewProps) {
  // Generate unique ID for this instance (for scoped CSS variables)
  const instanceId = React.useId();

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800',
        className
      )}
      style={
        {
          '--animation-duration': `${duration}s`,
        } as React.CSSProperties
      }
    >
      {/* Animation container */}
      <div className="relative w-full h-full">
        {animationStyle === 'slider' && (
          <SliderAnimation
            beforeImageUrl={beforeImageUrl}
            afterImageUrl={afterImageUrl}
            showLabels={showLabels}
          />
        )}

        {animationStyle === 'crossfade' && (
          <CrossfadeAnimation
            beforeImageUrl={beforeImageUrl}
            afterImageUrl={afterImageUrl}
            showLabels={showLabels}
          />
        )}

        {animationStyle === 'toggle' && (
          <ToggleAnimation
            beforeImageUrl={beforeImageUrl}
            afterImageUrl={afterImageUrl}
            showLabels={showLabels}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Slider Animation
 * Vertical wipe revealing after image from left to right
 */
function SliderAnimation({
  beforeImageUrl,
  afterImageUrl,
  showLabels,
}: {
  beforeImageUrl: string;
  afterImageUrl: string;
  showLabels: boolean;
}) {
  return (
    <div className="relative w-full h-full">
      {/* After photo (base layer) */}
      <div className="absolute inset-0">
        <img
          src={afterImageUrl}
          alt="After"
          className="w-full h-full object-cover"
        />
        {showLabels && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 text-white text-sm font-medium rounded-md">
            After
          </div>
        )}
      </div>

      {/* Before photo (animated clip-path) */}
      <div
        className="absolute inset-0 animate-slider-wipe"
        style={{
          animationDuration: 'var(--animation-duration)',
        }}
      >
        <img
          src={beforeImageUrl}
          alt="Before"
          className="w-full h-full object-cover"
        />
        {showLabels && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 text-white text-sm font-medium rounded-md">
            Before
          </div>
        )}
      </div>

      {/* Slider line indicator */}
      <div
        className="absolute inset-y-0 w-1 bg-white shadow-lg pointer-events-none animate-slider-line"
        style={{
          animationDuration: 'var(--animation-duration)',
        }}
      />
    </div>
  );
}

/**
 * Crossfade Animation
 * Smooth opacity transition between before and after
 */
function CrossfadeAnimation({
  beforeImageUrl,
  afterImageUrl,
  showLabels,
}: {
  beforeImageUrl: string;
  afterImageUrl: string;
  showLabels: boolean;
}) {
  return (
    <div className="relative w-full h-full">
      {/* After photo (base layer) */}
      <div className="absolute inset-0">
        <img
          src={afterImageUrl}
          alt="After"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Before photo (animated opacity) */}
      <div
        className="absolute inset-0 animate-crossfade"
        style={{
          animationDuration: 'var(--animation-duration)',
        }}
      >
        <img
          src={beforeImageUrl}
          alt="Before"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Labels (animated with before photo) */}
      {showLabels && (
        <>
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 text-white text-sm font-medium rounded-md">
            <span
              className="inline-block animate-crossfade"
              style={{
                animationDuration: 'var(--animation-duration)',
              }}
            >
              Before
            </span>
            <span className="inline-block">After</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Toggle Animation
 * Quick snap between before and after photos
 */
function ToggleAnimation({
  beforeImageUrl,
  afterImageUrl,
  showLabels,
}: {
  beforeImageUrl: string;
  afterImageUrl: string;
  showLabels: boolean;
}) {
  return (
    <div className="relative w-full h-full">
      {/* After photo (base layer) */}
      <div className="absolute inset-0">
        <img
          src={afterImageUrl}
          alt="After"
          className="w-full h-full object-cover"
        />
        {showLabels && (
          <div
            className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 text-white text-sm font-medium rounded-md animate-toggle-reverse"
            style={{
              animationDuration: 'var(--animation-duration)',
            }}
          >
            After
          </div>
        )}
      </div>

      {/* Before photo (toggle visibility) */}
      <div
        className="absolute inset-0 animate-toggle"
        style={{
          animationDuration: 'var(--animation-duration)',
        }}
      >
        <img
          src={beforeImageUrl}
          alt="Before"
          className="w-full h-full object-cover"
        />
        {showLabels && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 text-white text-sm font-medium rounded-md">
            Before
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Global CSS animations for GIF preview
 * Add these to your global CSS file or Tailwind config
 */
if (typeof document !== 'undefined') {
  const styleId = 'gif-preview-animations';

  // Only inject styles once
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Slider wipe animation - clip-path from right to left */
      @keyframes slider-wipe {
        0% {
          clip-path: inset(0 0 0 0);
        }
        100% {
          clip-path: inset(0 0 0 100%);
        }
      }

      .animate-slider-wipe {
        animation: slider-wipe var(--animation-duration, 2s) ease-in-out infinite;
      }

      /* Slider line indicator */
      @keyframes slider-line {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }

      .animate-slider-line {
        animation: slider-line var(--animation-duration, 2s) ease-in-out infinite;
      }

      /* Crossfade animation - opacity fade in/out */
      @keyframes crossfade {
        0%, 10% {
          opacity: 1;
        }
        40%, 60% {
          opacity: 0;
        }
        90%, 100% {
          opacity: 1;
        }
      }

      .animate-crossfade {
        animation: crossfade var(--animation-duration, 2s) ease-in-out infinite;
      }

      /* Toggle animation - snap between visible/hidden */
      @keyframes toggle {
        0%, 45% {
          opacity: 1;
        }
        50%, 95% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }

      .animate-toggle {
        animation: toggle var(--animation-duration, 2s) step-end infinite;
      }

      /* Reverse toggle for labels */
      @keyframes toggle-reverse {
        0%, 45% {
          opacity: 0;
        }
        50%, 95% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }

      .animate-toggle-reverse {
        animation: toggle-reverse var(--animation-duration, 2s) step-end infinite;
      }
    `;
    document.head.appendChild(style);
  }
}
