'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { useEditorStore } from '@/stores/editor-store';
import { useUserStore } from '@/stores/user-store';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { useCanvasExport } from '@/hooks/useCanvasExport';
import { useGifExport } from '@/hooks/useGifExport';
import { GifPreview } from './GifPreview';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';
import type { ExportFormat as LibExportFormat } from '@/lib/canvas/export';
import type { AnimationStyle } from '@/lib/canvas/export-gif';
import type { Photo } from '@/types/editor';
import { AlignedPreview } from './AlignedPreview';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportType = 'png' | 'gif';
type AspectRatio = '4:5' | '1:1' | '9:16';
type BackgroundType = 'original' | 'transparent' | 'color' | 'image';

interface BackgroundState {
  type: BackgroundType;
  colorValue?: string;
  imageId?: string;
  customImageUrl?: string;
}

// Animation style options with icons
const animationStyleOptions = [
  { value: 'slider', label: '↔', title: 'Slider' },
  { value: 'crossfade', label: '◐', title: 'Fade' },
  { value: 'toggle', label: '⇄', title: 'Toggle' },
];

// Image presets for background (placeholder IDs)
const imagePresets = [
  { id: 'gym', thumbnail: '/backgrounds/gym.jpg', label: 'Gym' },
  { id: 'studio', thumbnail: '/backgrounds/studio.jpg', label: 'Studio' },
  { id: 'outdoor', thumbnail: '/backgrounds/outdoor.jpg', label: 'Outdoor' },
];

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { beforePhoto, afterPhoto, alignment, backgroundSettings, setBeforePhoto, setAfterPhoto, setBackgroundSettings } = useEditorStore();
  // TODO: Remove this bypass once payment is implemented
  const isPro = true; // Temporarily bypass Pro checks for testing
  // const isPro = useUserStore((state) => state.isPro());
  const profile = useUserStore((state) => state.profile);
  const { limit, remaining, checkAndIncrement } = useUsageLimit();
  const { isExporting, error: exportError, exportAndDownload, clearError } = useCanvasExport();
  const {
    isExporting: isExportingGif,
    progress: gifProgress,
    status: gifStatus,
    error: gifError,
    exportAndDownload: exportGifAndDownload,
  } = useGifExport();
  const {
    processImage: removeBackground,
    error: bgRemovalError,
  } = useBackgroundRemoval();

  // Primary state
  const [exportType, setExportType] = React.useState<ExportType>('png');

  // GIF-specific state
  const [animationStyle, setAnimationStyle] = React.useState<AnimationStyle>('slider');
  const [duration, setDuration] = React.useState(2);

  // Advanced options (collapsed by default)
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatio>('4:5');
  const [background, setBackground] = React.useState<BackgroundState>({ type: 'original' });
  const [addLabels, setAddLabels] = React.useState(false);
  const [removeWatermark, setRemoveWatermark] = React.useState(true);
  const [addLogo, setAddLogo] = React.useState(false);

  // UI state
  const [isMoreOptionsExpanded, setIsMoreOptionsExpanded] = React.useState(false);
  const [isBackgroundExpanded, setIsBackgroundExpanded] = React.useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = React.useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = React.useState<'limit' | 'watermark' | 'format' | 'logo' | 'gif' | 'background'>('limit');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [isRemovingBackgrounds, setIsRemovingBackgrounds] = React.useState(false);

  const hasPhotos = Boolean(beforePhoto && afterPhoto);
  const hasBackgroundRemoved = beforePhoto?.hasBackgroundRemoved || afterPhoto?.hasBackgroundRemoved;

  // Clear errors when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      clearError();
      setLocalError(null);
    }
  }, [isOpen, clearError]);

  // Format the usage text
  const usageText = React.useMemo(() => {
    if (isPro) {
      return 'Unlimited exports';
    }
    return `${remaining} of ${limit} exports remaining`;
  }, [isPro, remaining, limit]);

  // Handle export type selection
  const handleExportTypeChange = (type: string) => {
    if (type === 'gif' && !isPro) {
      setUpgradeTrigger('gif');
      setShowUpgradePrompt(true);
      return;
    }
    setExportType(type as ExportType);
  };

  // Handle watermark removal toggle (Pro only)
  const handleRemoveWatermarkToggle = () => {
    if (!isPro) {
      setUpgradeTrigger('watermark');
      setShowUpgradePrompt(true);
      return;
    }
    setRemoveWatermark(!removeWatermark);
  };

  // Handle logo toggle (Pro only)
  const handleLogoToggle = () => {
    if (!isPro) {
      setUpgradeTrigger('logo');
      setShowUpgradePrompt(true);
      return;
    }
    setAddLogo(!addLogo);
  };

  // Handle background type change
  const handleBackgroundTypeChange = async (type: string) => {
    const newType = type as BackgroundType;

    // For transparent or color backgrounds, we need to remove the background first
    if ((newType === 'transparent' || newType === 'color') && !hasBackgroundRemoved) {
      await handleRemoveBackgrounds();
    }

    setBackground(prev => ({ ...prev, type: newType }));

    // Update editor store background settings
    if (newType === 'original') {
      setBackgroundSettings({ type: 'original' });
    } else if (newType === 'transparent') {
      setBackgroundSettings({ type: 'transparent' });
    } else if (newType === 'color' && background.colorValue) {
      setBackgroundSettings({ type: 'solid', color: background.colorValue });
    }
  };

  // Handle color selection - only changes color since bg is already removed when 'color' type is selected
  const handleColorSelect = async (color: string) => {
    // If this is the first color selection and background hasn't been removed yet, remove it first
    if (!hasBackgroundRemoved) {
      await handleRemoveBackgrounds();
    }
    setBackground(prev => ({ ...prev, type: 'color', colorValue: color }));
    setBackgroundSettings({ type: 'solid', color });
  };

  // Handle background removal for both photos
  const handleRemoveBackgrounds = async () => {
    if (!hasPhotos || !beforePhoto || !afterPhoto) return;

    setIsRemovingBackgrounds(true);

    try {
      // Remove background from "before" photo if not already done
      if (!beforePhoto.hasBackgroundRemoved) {
        const beforeResult = await removeBackground(beforePhoto.dataUrl);
        if (beforeResult) {
          const updatedBefore: Photo = {
            ...beforePhoto,
            dataUrl: beforeResult.processedDataUrl,
            hasBackgroundRemoved: true,
            originalDataUrl: beforePhoto.originalDataUrl || beforePhoto.dataUrl,
            segmentationMask: beforeResult.mask,
          };
          setBeforePhoto(updatedBefore);
        }
      }

      // Remove background from "after" photo if not already done
      if (!afterPhoto.hasBackgroundRemoved) {
        const afterResult = await removeBackground(afterPhoto.dataUrl);
        if (afterResult) {
          const updatedAfter: Photo = {
            ...afterPhoto,
            dataUrl: afterResult.processedDataUrl,
            hasBackgroundRemoved: true,
            originalDataUrl: afterPhoto.originalDataUrl || afterPhoto.dataUrl,
            segmentationMask: afterResult.mask,
          };
          setAfterPhoto(updatedAfter);
        }
      }
    } finally {
      setIsRemovingBackgrounds(false);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!hasPhotos || !beforePhoto || !afterPhoto) return;

    setLocalError(null);

    try {
      // Check usage limit and increment
      const allowed = await checkAndIncrement();

      if (!allowed) {
        // Show upgrade prompt if limit reached
        setUpgradeTrigger('limit');
        setShowUpgradePrompt(true);
        return;
      }

      // Get custom logo URL if Pro user has one
      const customLogoUrl = isPro && (profile as unknown as { logo_url?: string })?.logo_url
        ? (profile as unknown as { logo_url: string }).logo_url
        : undefined;

      let success = false;

      if (exportType === 'gif') {
        // Export as GIF
        success = await exportGifAndDownload(
          beforePhoto,
          afterPhoto,
          {
            format: aspectRatio as LibExportFormat,
            animationStyle,
            duration,
            includeLabels: addLabels,
            watermark: {
              isPro: isPro && removeWatermark,
              customLogoUrl: addLogo ? customLogoUrl : undefined,
            },
            backgroundSettings: hasBackgroundRemoved ? backgroundSettings : undefined,
          }
        );
      } else {
        // Export as PNG
        success = await exportAndDownload(
          beforePhoto,
          afterPhoto,
          alignment,
          {
            format: aspectRatio as LibExportFormat,
            resolution: 1080,
            includeLabels: addLabels,
            watermark: {
              isPro: isPro && removeWatermark,
              customLogoUrl: addLogo ? customLogoUrl : undefined,
            },
            quality: 0.92,
            backgroundSettings: hasBackgroundRemoved ? backgroundSettings : undefined,
          }
        );
      }

      if (success) {
        // Success - close modal
        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
      setLocalError(error instanceof Error ? error.message : 'Export failed');
    }
  };

  // Get background label for display
  const getBackgroundLabel = () => {
    switch (background.type) {
      case 'original':
        return 'Original';
      case 'transparent':
        return 'None';
      case 'color':
        return background.colorValue ? background.colorValue.toUpperCase() : 'Custom';
      case 'image':
        return imagePresets.find(p => p.id === background.imageId)?.label || 'Custom';
      default:
        return 'Original';
    }
  };

  // Combined error display
  const displayError = localError || exportError || gifError || bgRemovalError;
  const isAnyExporting = isExporting || isExportingGif || isRemovingBackgrounds;

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
            )}
          />
          <Dialog.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-[448px] translate-x-[-50%] translate-y-[-50%]',
              'bg-[var(--surface-primary)] rounded-2xl shadow-[var(--shadow-lg)]',
              'max-h-[90vh] overflow-hidden',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
              'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
              'duration-200'
            )}
          >
            {/* Processing Overlay - Full modal overlay */}
            {isRemovingBackgrounds && (
              <div className="absolute inset-0 z-50 bg-[var(--surface-primary)]/95 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-[var(--gray-200)]" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--brand-pink)] animate-spin" />
                  </div>
                  <p className="text-base font-medium text-[var(--text-primary)]">Removing backgrounds...</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">This may take a few seconds</p>
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">
                Export
              </Dialog.Title>
              <Dialog.Close
                className={cn(
                  'rounded-lg p-1.5',
                  'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  'hover:bg-[var(--gray-100)]',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-pink)]'
                )}
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Dialog.Close>
            </div>

            {/* Error Display */}
            {displayError && (
              <div className="mx-4 mt-4 p-3 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20">
                <p className="text-sm text-[var(--error)]">{displayError}</p>
              </div>
            )}

            {/* Preview Area */}
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
                        className="absolute inset-0"
                      />
                    )}

                    {/* Watermark (Free users only) */}
                    {(!isPro || !removeWatermark) && (
                      <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 text-zinc-900 text-xs font-light tracking-tight rounded-md backdrop-blur-sm">
                        svolta
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

            {/* Primary Toggle - Image / Animation */}
            <div className="px-4 pb-4">
              <div className="flex p-1 bg-[var(--gray-100)] dark:bg-[var(--gray-800)] rounded-xl">
                <button
                  onClick={() => handleExportTypeChange('png')}
                  className={cn(
                    'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200',
                    exportType === 'png'
                      ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  Image
                </button>
                <button
                  onClick={() => handleExportTypeChange('gif')}
                  className={cn(
                    'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200',
                    exportType === 'gif'
                      ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                    !isPro && 'opacity-50'
                  )}
                >
                  Animation
                  {!isPro && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-pink)]/10 text-[var(--brand-pink)]">
                      PRO
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* GIF-specific controls (conditional) */}
            <AnimatePresence>
              {exportType === 'gif' && isPro && (
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
                            onClick={() => setAnimationStyle(style.value as AnimationStyle)}
                            title={style.title}
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
                        onChange={(e) => setDuration(parseFloat(e.target.value))}
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

            {/* More Options (collapsible) */}
            <div className="border-t border-[var(--border-default)]">
              <button
                onClick={() => setIsMoreOptionsExpanded(!isMoreOptionsExpanded)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <span>More options</span>
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
                    'transition-transform duration-200',
                    isMoreOptionsExpanded && 'rotate-180'
                  )}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <AnimatePresence>
                {isMoreOptionsExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1">
                      {/* Aspect Ratio */}
                      <div className="py-3">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                          Aspect Ratio
                        </label>
                        <div className="flex p-1 bg-[var(--gray-100)] dark:bg-[var(--gray-800)] rounded-xl">
                          {(['4:5', '1:1', '9:16'] as AspectRatio[]).map((ratio) => (
                            <button
                              key={ratio}
                              onClick={() => setAspectRatio(ratio)}
                              className={cn(
                                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200',
                                aspectRatio === ratio
                                  ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              )}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Background - Expandable Row */}
                      <div className="border-t border-[var(--border-default)] pt-1">
                        <button
                          onClick={() => setIsBackgroundExpanded(!isBackgroundExpanded)}
                          className="flex items-center justify-between w-full py-3 text-sm"
                        >
                          <span className="text-[var(--text-primary)]">Background</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-tertiary)]">{getBackgroundLabel()}</span>
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
                                isBackgroundExpanded && 'rotate-180'
                              )}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>

                        <AnimatePresence>
                          {isBackgroundExpanded && (
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
                                      onClick={() => handleBackgroundTypeChange(type)}
                                      className={cn(
                                        'flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 capitalize',
                                        background.type === type
                                          ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
                                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                      )}
                                    >
                                      {type === 'transparent' ? 'None' : type === 'original' ? 'Original' : type}
                                    </button>
                                  ))}
                                </div>

                                {/* Color Picker (conditional) */}
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
                                        onChange={(e) => handleColorSelect(e.target.value)}
                                      />
                                    </label>
                                    <div className="flex-1">
                                      <p className="text-sm text-[var(--text-primary)]">Pick a color</p>
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
                                          onClick={() => setBackground(prev => ({ ...prev, imageId: preset.id }))}
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

                      {/* Add Labels Toggle */}
                      <div className="flex items-center justify-between py-3 border-t border-[var(--border-default)]">
                        <span className="text-sm text-[var(--text-primary)]">Add &ldquo;Before/After&rdquo; labels</span>
                        <button
                          onClick={() => setAddLabels(!addLabels)}
                          className={cn(
                            'relative w-11 h-6 rounded-full transition-colors duration-300',
                            addLabels ? 'bg-instagram-gradient' : 'bg-[var(--gray-200)] dark:bg-[var(--gray-700)]'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300',
                              addLabels && 'translate-x-5'
                            )}
                          />
                        </button>
                      </div>

                      {/* Remove Watermark Toggle */}
                      <div className="flex items-center justify-between py-3 border-t border-[var(--border-default)]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--text-primary)]">Remove watermark</span>
                          {!isPro && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-pink)]/10 text-[var(--brand-pink)]">
                              PRO
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleRemoveWatermarkToggle}
                          disabled={!isPro}
                          className={cn(
                            'relative w-11 h-6 rounded-full transition-colors duration-300',
                            removeWatermark && isPro ? 'bg-instagram-gradient' : 'bg-[var(--gray-200)] dark:bg-[var(--gray-700)]',
                            !isPro && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300',
                              removeWatermark && isPro && 'translate-x-5'
                            )}
                          />
                        </button>
                      </div>

                      {/* Add Logo Toggle */}
                      <div className="flex items-center justify-between py-3 border-t border-[var(--border-default)]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--text-primary)]">Add your logo</span>
                          {!isPro && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-pink)]/10 text-[var(--brand-pink)]">
                              PRO
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleLogoToggle}
                          disabled={!isPro}
                          className={cn(
                            'relative w-11 h-6 rounded-full transition-colors duration-300',
                            addLogo && isPro ? 'bg-instagram-gradient' : 'bg-[var(--gray-200)] dark:bg-[var(--gray-700)]',
                            !isPro && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300',
                              addLogo && isPro && 'translate-x-5'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* GIF Export Progress (shown during GIF export) */}
            {isExportingGif && (
              <div className="px-4 pb-4 space-y-2">
                <div className="w-full bg-[var(--gray-200)] rounded-full h-1 overflow-hidden">
                  <div
                    className="h-full bg-instagram-gradient rounded-full transition-all duration-300"
                    style={{ width: `${gifProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] text-center">
                  {gifStatus === 'frames' ? 'Generating frames...' : 'Encoding GIF...'}
                </p>
              </div>
            )}

            {/* CTA Button */}
            <div className="p-4 border-t border-[var(--border-default)]">
              <button
                onClick={handleDownload}
                disabled={!hasPhotos || isAnyExporting}
                className={cn(
                  'w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200',
                  'bg-instagram-gradient',
                  'hover:opacity-90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-pink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isAnyExporting && 'animate-pulse'
                )}
              >
                {isAnyExporting
                  ? exportType === 'gif'
                    ? 'Exporting GIF...'
                    : 'Exporting...'
                  : `Download ${exportType.toUpperCase()}`}
              </button>

              {/* Usage text */}
              <p className="mt-3 text-center text-xs text-[var(--text-tertiary)]">
                {usageText}
              </p>
            </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        trigger={upgradeTrigger}
      />
    </>
  );
}
