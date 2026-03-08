'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { imagePresets, type BackgroundState } from '@/lib/export-utils';

type BackgroundType = 'original' | 'transparent' | 'color' | 'image';

interface BackgroundSectionProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  background: BackgroundState;
  backgroundLabel: string;
  onTypeChange: (type: string) => void;
  onColorSelect: (color: string) => void;
  onImageSelect: (imageId: string) => void;
}

export function BackgroundSection({
  isExpanded,
  onToggleExpanded,
  background,
  backgroundLabel,
  onTypeChange,
  onColorSelect,
  onImageSelect,
}: BackgroundSectionProps) {
  return (
    <div className="border-t border-[var(--border-default)] pt-1">
      <button
        onClick={onToggleExpanded}
        className="flex items-center justify-between w-full py-3 text-sm"
      >
        <span className="text-[var(--text-primary)]">Background</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-tertiary)]">{backgroundLabel}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              'text-[var(--text-tertiary)] transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3 space-y-3">
              {/* Background Type Segmented Control */}
              <div className="flex p-1 bg-[var(--gray-100)] dark:bg-[var(--gray-800)] rounded-xl">
                {(['original', 'transparent', 'color', 'image'] as BackgroundType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => onTypeChange(type)}
                    className={cn(
                      'flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 capitalize',
                      background.type === type
                        ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {type === 'transparent' ? 'None' : type === 'original' ? 'Original' : type === 'color' ? 'Colour' : type}
                  </button>
                ))}
              </div>

              {/* Colour Picker (conditional) */}
              {background.type === 'color' && (
                <div className="flex items-center gap-3">
                  <label className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-xl cursor-pointer border-2 border-[var(--border-default)] hover:border-[var(--brand-pink)] transition-colors"
                      style={{ backgroundColor: background.colorValue || '#ffffff' }}
                    />
                    <input
                      type="color"
                      value={background.colorValue || '#ffffff'}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => onColorSelect(e.target.value)}
                    />
                  </label>
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-primary)]">Pick a colour</p>
                    <p className="text-xs text-[var(--text-tertiary)] uppercase">{background.colorValue || '#ffffff'}</p>
                  </div>
                </div>
              )}

              {/* Image Presets (conditional) */}
              {background.type === 'image' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {imagePresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => onImageSelect(preset.id)}
                        className={cn(
                          'flex-1 h-16 rounded-xl bg-[var(--gray-100)] overflow-hidden transition-all duration-150',
                          background.imageId === preset.id
                            ? 'ring-2 ring-[var(--brand-pink)] ring-offset-2 ring-offset-[var(--surface-primary)]'
                            : 'hover:opacity-80'
                        )}
                      >
                        <div className="w-full h-full bg-[var(--gray-200)] flex items-center justify-center text-xs text-[var(--text-secondary)]">
                          {preset.label}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button className="w-full h-12 rounded-xl border-2 border-dashed border-[var(--gray-300)] hover:border-[var(--gray-400)] text-[var(--text-secondary)] text-sm transition-colors">
                    Upload image
                  </button>
                </div>
              )}

              {/* None helper text */}
              {background.type === 'transparent' && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  Background will be removed
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
