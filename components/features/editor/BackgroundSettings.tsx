'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';
import { useUserStore } from '@/stores/user-store';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  GRADIENT_PRESETS,
  SOLID_COLOR_PRESETS,
  type BackgroundSettings as BackgroundSettingsType,
  type BackgroundType,
  createGradientBackground,
  createSolidBackground,
} from '@/lib/segmentation/backgrounds';

export interface BackgroundSettingsProps {
  disabled?: boolean;
  hasRemovedBackground: boolean;
  onUpgradeClick?: () => void;
  className?: string;
}

const LockIcon = () => (
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
    className="inline-block ml-1.5"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const backgroundTypeOptions = [
  { value: 'original', label: 'Original' },
  { value: 'transparent', label: 'Transparent' },
  { value: 'solid', label: 'Solid' },
  { value: 'gradient', label: 'Gradient' },
];

export function BackgroundSettings({
  disabled,
  hasRemovedBackground,
  onUpgradeClick,
  className,
}: BackgroundSettingsProps): React.ReactElement {
  const { backgroundSettings, setBackgroundSettings } = useEditorStore();
  const isPro = useUserStore((state) => state.isPro());

  const [customColor, setCustomColor] = React.useState('#ffffff');

  // Lock feature for free users
  const isLocked = !isPro;

  // Handle background type change
  const handleTypeChange = (value: string) => {
    if (isLocked && onUpgradeClick) {
      onUpgradeClick();
      return;
    }

    const type = value as BackgroundType;

    if (type === 'original') {
      setBackgroundSettings({ type: 'original' });
    } else if (type === 'transparent') {
      setBackgroundSettings({ type: 'transparent' });
    } else if (type === 'solid') {
      // Default to white
      setBackgroundSettings(createSolidBackground(SOLID_COLOR_PRESETS[0].color));
    } else if (type === 'gradient') {
      // Default to first gradient
      const firstGradient = createGradientBackground('clean-studio');
      if (firstGradient) {
        setBackgroundSettings(firstGradient);
      }
    }
  };

  // Handle solid color selection
  const handleColorSelect = (color: string) => {
    if (isLocked && onUpgradeClick) {
      onUpgradeClick();
      return;
    }
    setBackgroundSettings(createSolidBackground(color));
    setCustomColor(color);
  };

  // Handle gradient selection
  const handleGradientSelect = (presetId: string) => {
    if (isLocked && onUpgradeClick) {
      onUpgradeClick();
      return;
    }
    const gradient = createGradientBackground(presetId);
    if (gradient) {
      setBackgroundSettings(gradient);
    }
  };

  // Handle custom color input
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    handleColorSelect(color);
  };

  // Render gradient preview
  const renderGradientPreview = (presetId: string) => {
    const preset = GRADIENT_PRESETS[presetId];
    if (!preset) return null;

    const gradientStyle: React.CSSProperties =
      preset.type === 'linear'
        ? {
            background: `linear-gradient(${preset.angle || 180}deg, ${preset.colors.join(', ')})`,
          }
        : {
            background: `radial-gradient(circle, ${preset.colors.join(', ')})`,
          };

    return (
      <button
        key={presetId}
        onClick={() => handleGradientSelect(presetId)}
        disabled={disabled || isLocked}
        className={cn(
          'group relative w-full aspect-[3/2] rounded-xl overflow-hidden',
          'border-2 transition-all duration-200',
          backgroundSettings.type === 'gradient' &&
          backgroundSettings.gradient?.id === presetId
            ? 'border-[var(--brand-primary)] shadow-md'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          (disabled || isLocked) && 'opacity-50 cursor-not-allowed'
        )}
        style={{
          transitionTimingFunction: 'var(--ease-apple)',
        }}
      >
        {/* Gradient preview */}
        <div className="absolute inset-0" style={gradientStyle} />

        {/* Label overlay */}
        <div className="absolute inset-0 flex items-end p-3 bg-gradient-to-t from-black/50 to-transparent">
          <span className="text-sm font-medium text-white">{preset.name}</span>
        </div>

        {/* Selected indicator */}
        {backgroundSettings.type === 'gradient' &&
          backgroundSettings.gradient?.id === presetId && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
      </button>
    );
  };

  // Show message if background hasn't been removed
  if (!hasRemovedBackground) {
    return (
      <div className={cn('p-6 rounded-xl bg-gray-50 dark:bg-gray-900', className)}>
        <div className="flex items-start gap-3">
          <div className="text-2xl" role="img" aria-label="Info">
            ℹ️
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              Background Options Unavailable
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Remove the background from your photos first to access background replacement options.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Pro badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Background
        </h3>
        {isLocked && (
          <button
            onClick={onUpgradeClick}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'text-xs font-medium text-[var(--brand-primary)]',
              'bg-[var(--brand-primary)]/10',
              'hover:bg-[var(--brand-primary)]/20',
              'transition-colors duration-200'
            )}
            style={{
              transitionTimingFunction: 'var(--ease-apple)',
            }}
          >
            <LockIcon />
            Pro
          </button>
        )}
      </div>

      {/* Background Type Selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
          Type
        </label>
        <SegmentedControl
          options={backgroundTypeOptions}
          value={backgroundSettings.type}
          onValueChange={handleTypeChange}
          size="md"
          fullWidth
        />
      </div>

      {/* Solid Color Options */}
      {backgroundSettings.type === 'solid' && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            Color
          </label>

          {/* Preset Colors Grid */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            {SOLID_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.color}
                onClick={() => handleColorSelect(preset.color)}
                disabled={disabled || isLocked}
                className={cn(
                  'group relative w-full aspect-square rounded-xl overflow-hidden',
                  'border-2 transition-all duration-200',
                  backgroundSettings.color === preset.color
                    ? 'border-[var(--brand-primary)] shadow-md scale-105'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-105',
                  (disabled || isLocked) && 'opacity-50 cursor-not-allowed'
                )}
                style={{
                  backgroundColor: preset.color,
                  transitionTimingFunction: 'var(--ease-apple)',
                }}
                title={preset.name}
              >
                {/* Selected indicator */}
                {backgroundSettings.color === preset.color && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom Color Picker */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="custom-color"
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-xl border-2 overflow-hidden',
                  'border-gray-200 dark:border-gray-700',
                  (disabled || isLocked) && 'opacity-50 cursor-not-allowed'
                )}
                style={{ backgroundColor: customColor }}
              />
              <span className="text-sm text-[var(--text-secondary)]">Custom</span>
            </label>
            <input
              id="custom-color"
              type="color"
              value={customColor}
              onChange={handleCustomColorChange}
              disabled={disabled || isLocked}
              className="sr-only"
            />
          </div>
        </div>
      )}

      {/* Gradient Options */}
      {backgroundSettings.type === 'gradient' && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            Gradient Preset
          </label>

          <div className="grid grid-cols-2 gap-4">
            {Object.keys(GRADIENT_PRESETS).map(renderGradientPreview)}
          </div>
        </div>
      )}

      {/* Info for transparent */}
      {backgroundSettings.type === 'transparent' && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            Export will use a transparent background (PNG format recommended).
          </p>
        </div>
      )}

      {/* Info for original */}
      {backgroundSettings.type === 'original' && (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-[var(--text-secondary)]">
            Original background will be preserved in the export.
          </p>
        </div>
      )}
    </div>
  );
}
