'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { useEditorStore } from '@/stores/editor-store';
import { useUserStore } from '@/stores/user-store';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { useCanvasExport } from '@/hooks/useCanvasExport';
import { useGifExport } from '@/hooks/useGifExport';
import type { ExportFormat as LibExportFormat } from '@/lib/canvas/export';
import type { AnimationStyle } from '@/lib/canvas/export-gif';
import { canvasLogger } from '@/lib/logger';
import { logExportEvent, type ExportType, type AspectRatio, type BackgroundState, imagePresets } from '@/lib/export-utils';
import { useExportBackgroundRemoval } from '@/hooks/useExportBackgroundRemoval';
import { ExportPreview } from './export/ExportPreview';
import { ExportTypeToggle } from './export/ExportTypeToggle';
import { GifControls } from './export/GifControls';
import { MoreOptionsSection } from './export/MoreOptionsSection';
import { AspectRatioSelector } from './export/AspectRatioSelector';
import { BackgroundSection } from './export/BackgroundSection';
import { ProToggle } from './export/ProToggle';
import { ExportProgressBar } from './export/ExportProgressBar';
import { ExportButton } from './export/ExportButton';
import { SignupPromptModal } from './export/SignupPromptModal';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BackgroundType = 'original' | 'transparent' | 'color' | 'image';

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const beforePhoto = useEditorStore((s) => s.beforePhoto);
  const afterPhoto = useEditorStore((s) => s.afterPhoto);
  const alignment = useEditorStore((s) => s.alignment);
  const backgroundSettings = useEditorStore((s) => s.backgroundSettings);
  const setBackgroundSettings = useEditorStore((s) => s.setBackgroundSettings);
  const setUserFraming = useEditorStore((s) => s.setUserFraming);
  const isPro = useUserStore((state) => state.isPro());
  const profile = useUserStore((state) => state.profile);
  const { limit, remaining, checkAndIncrement, isAnonymous } = useUsageLimit();
  const { isExporting, error: exportError, exportAndDownload, clearError } = useCanvasExport();
  const {
    isExporting: isExportingGif,
    progress: gifProgress,
    status: gifStatus,
    error: gifError,
    exportAndDownload: exportGifAndDownload,
  } = useGifExport();
  const {
    isRemovingBackgrounds,
    error: bgRemovalError,
    removeBackgrounds: handleRemoveBackgrounds,
    hasBackgroundRemoved,
  } = useExportBackgroundRemoval();

  // Export config
  const [exportType, setExportType] = React.useState<ExportType>('png');
  const [animationStyle, setAnimationStyle] = React.useState<AnimationStyle>('slider');
  const [duration, setDuration] = React.useState(2);

  // Options
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatio>('4:5');
  const [background, setBackground] = React.useState<BackgroundState>({ type: 'original' });
  const [addLabels, setAddLabels] = React.useState(false);
  const [removeWatermark, setRemoveWatermark] = React.useState(true);
  const [addLogo, setAddLogo] = React.useState(false);

  // UI expand/collapse
  const [isMoreOptionsExpanded, setIsMoreOptionsExpanded] = React.useState(false);
  const [isBackgroundExpanded, setIsBackgroundExpanded] = React.useState(false);

  // Modal visibility
  const [showUpgradePrompt, setShowUpgradePrompt] = React.useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = React.useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = React.useState<'limit' | 'watermark' | 'format' | 'logo' | 'gif' | 'background'>('limit');

  const [localError, setLocalError] = React.useState<string | null>(null);

  const hasPhotos = Boolean(beforePhoto && afterPhoto);

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

    // For transparent or colour backgrounds, we need to remove the background first
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

  // Handle colour selection
  const handleColorSelect = async (color: string) => {
    if (!hasBackgroundRemoved) {
      await handleRemoveBackgrounds();
    }
    setBackground(prev => ({ ...prev, type: 'color', colorValue: color }));
    setBackgroundSettings({ type: 'solid', color });
  };

  // Handle download
  const handleDownload = async () => {
    if (!hasPhotos || !beforePhoto || !afterPhoto) return;

    setLocalError(null);

    try {
      // Check usage limit and increment
      const allowed = await checkAndIncrement();

      if (!allowed) {
        if (isAnonymous) {
          setShowSignupPrompt(true);
        } else {
          setUpgradeTrigger('limit');
          setShowUpgradePrompt(true);
        }
        return;
      }

      // Get custom logo URL if Pro user has one
      const customLogoUrl = isPro && (profile as unknown as { logo_url?: string })?.logo_url
        ? (profile as unknown as { logo_url: string }).logo_url
        : undefined;

      let success = false;

      if (exportType === 'gif') {
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

      canvasLogger.info('Export result', { success, exportType, aspectRatio, isAnonymous });

      if (success) {
        canvasLogger.debug('Logging export event');
        logExportEvent(
          exportType === 'gif' ? 'gif' : 'png',
          aspectRatio,
          isAnonymous
        );
        onClose();
      }
    } catch (error) {
      canvasLogger.error('Export failed', error);
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
        return background.colorValue ? background.colorValue.toUpperCase() : 'Colour';
      case 'image':
        return imagePresets.find(p => p.id === background.imageId)?.label || 'Custom';
      default:
        return 'Original';
    }
  };

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
            {/* Processing Overlay */}
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
                <Dialog.Description className="sr-only">
                  Configure and export your aligned before/after comparison as an image or animated GIF
                </Dialog.Description>
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

              <ExportPreview
                exportType={exportType}
                aspectRatio={aspectRatio}
                isPro={isPro}
                removeWatermark={removeWatermark}
                addLabels={addLabels}
                beforePhoto={beforePhoto}
                afterPhoto={afterPhoto}
                animationStyle={animationStyle}
                duration={duration}
                hasBackgroundRemoved={hasBackgroundRemoved}
                backgroundSettings={backgroundSettings}
              />

              <ExportTypeToggle
                exportType={exportType}
                isPro={isPro}
                onChange={handleExportTypeChange}
              />

              <GifControls
                visible={exportType === 'gif' && isPro}
                animationStyle={animationStyle}
                duration={duration}
                onStyleChange={setAnimationStyle}
                onDurationChange={setDuration}
              />

              <MoreOptionsSection
                isExpanded={isMoreOptionsExpanded}
                onToggle={() => setIsMoreOptionsExpanded(!isMoreOptionsExpanded)}
              >
                <AspectRatioSelector
                  value={aspectRatio}
                  onChange={(ratio) => { setAspectRatio(ratio); setUserFraming({ panX: 0, panY: 0 }); }}
                />

                <BackgroundSection
                  isExpanded={isBackgroundExpanded}
                  onToggleExpanded={() => setIsBackgroundExpanded(!isBackgroundExpanded)}
                  background={background}
                  backgroundLabel={getBackgroundLabel()}
                  onTypeChange={handleBackgroundTypeChange}
                  onColorSelect={handleColorSelect}
                  onImageSelect={(imageId) => setBackground(prev => ({ ...prev, imageId }))}
                />

                <ProToggle
                  label='Add "Before/After" labels'
                  checked={addLabels}
                  onToggle={() => setAddLabels(!addLabels)}
                />

                <ProToggle
                  label="Remove watermark"
                  checked={removeWatermark}
                  isPro={isPro}
                  requiresPro
                  onToggle={handleRemoveWatermarkToggle}
                />

                <ProToggle
                  label="Add your logo"
                  checked={addLogo}
                  isPro={isPro}
                  requiresPro
                  onToggle={handleLogoToggle}
                />
              </MoreOptionsSection>

              <ExportProgressBar
                visible={isExportingGif}
                progress={gifProgress}
                status={gifStatus}
              />

              <ExportButton
                hasPhotos={hasPhotos}
                isAnyExporting={isAnyExporting}
                exportType={exportType}
                usageText={usageText}
                onDownload={handleDownload}
              />
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

      <SignupPromptModal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
      />
    </>
  );
}
