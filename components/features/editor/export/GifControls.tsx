'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AnimationStyle } from '@/lib/canvas/export-gif';
import { animationStyleOptions } from '@/lib/export-utils';

interface GifControlsProps {
  visible: boolean;
  animationStyle: AnimationStyle;
  duration: number;
  onStyleChange: (style: AnimationStyle) => void;
  onDurationChange: (duration: number) => void;
}

export function GifControls({
  visible,
  animationStyle,
  duration,
  onStyleChange,
  onDurationChange,
}: GifControlsProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 space-y-4">
            {/* Animation Style */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Style
              </label>
              <div className="flex gap-2">
                {animationStyleOptions.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => onStyleChange(style.value as AnimationStyle)}
                    title={style.title}
                    aria-label={style.title}
                    className={cn(
                      'flex-1 h-10 rounded-lg text-lg font-medium transition-all duration-150',
                      animationStyle === style.value
                        ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
                        : 'bg-[var(--gray-100)] dark:bg-[var(--gray-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration/Speed Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Speed
                </label>
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {duration.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.5"
                value={duration}
                onChange={(e) => onDurationChange(parseFloat(e.target.value))}
                className={cn(
                  'w-full h-1 rounded-full appearance-none cursor-pointer',
                  'bg-[var(--gray-200)]',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
                  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--brand-pink)]',
                  '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer',
                  '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full',
                  '[&::-moz-range-thumb]:bg-[var(--brand-pink)] [&::-moz-range-thumb]:border-0',
                  '[&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer'
                )}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
