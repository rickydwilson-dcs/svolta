'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { useEditorStore } from '@/stores/editor-store';
import { useUserStore } from '@/stores/user-store';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { useCanvasExport } from '@/hooks/useCanvasExport';
import type { ExportFormat as LibExportFormat } from '@/lib/canvas/export';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = '1:1' | '4:5' | '9:16';

interface FormatOption {
  ratio: ExportFormat;
  label: string;
  isPro: boolean;
}

const formatOptions: FormatOption[] = [
  { ratio: '4:5', label: '4:5', isPro: false },
  { ratio: '1:1', label: '1:1', isPro: false },
  { ratio: '9:16', label: '9:16', isPro: true },
];

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { beforePhoto, afterPhoto, alignment } = useEditorStore();
  const isPro = useUserStore((state) => state.isPro());
  const profile = useUserStore((state) => state.profile);
  const { limit, remaining, checkAndIncrement } = useUsageLimit();
  const { isExporting, error: exportError, exportAndDownload, clearError } = useCanvasExport();

  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>('4:5');
  const [showLabels, setShowLabels] = React.useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = React.useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = React.useState<'limit' | 'watermark' | 'format' | 'logo'>('limit');
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
    return `Exports remaining: ${remaining} of ${limit} this month`;
  }, [isPro, remaining, limit]);

  // Handle format selection
  const handleFormatSelect = (format: ExportFormat) => {
    const option = formatOptions.find((opt) => opt.ratio === format);
    if (option?.isPro && !isPro) {
      setUpgradeTrigger('format');
      setShowUpgradePrompt(true);
      return;
    }
    setSelectedFormat(format);
  };

  // Handle watermark removal toggle (Pro only)
  const handleRemoveWatermark = () => {
    if (!isPro) {
      setUpgradeTrigger('watermark');
      setShowUpgradePrompt(true);
    }
  };

  // Handle logo addition (Pro only)
  const handleAddLogo = () => {
    if (!isPro) {
      setUpgradeTrigger('logo');
      setShowUpgradePrompt(true);
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
      // Note: logo_url would need to be added to profiles table schema
      const customLogoUrl = isPro && (profile as unknown as { logo_url?: string })?.logo_url
        ? (profile as unknown as { logo_url: string }).logo_url
        : undefined;

      // Export canvas with real export function
      const success = await exportAndDownload(
        beforePhoto,
        afterPhoto,
        alignment,
        {
          format: selectedFormat as LibExportFormat,
          resolution: 1080,
          includeLabels: showLabels,
          watermark: {
            isPro,
            customLogoUrl,
          },
          quality: 0.92,
        }
      );

      if (success) {
        // Success - close modal
        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
      setLocalError(error instanceof Error ? error.message : 'Export failed');
    }
  };

  // Combined error display
  const displayError = localError || exportError;

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
              'fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]',
              'bg-[var(--surface-primary)] rounded-3xl shadow-[var(--shadow-lg)]',
              'p-8 md:p-10',
              'max-h-[90vh] overflow-y-auto',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
              'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
              'duration-200',
              'mx-4'
            )}
            style={{
              transitionTimingFunction: 'var(--ease-apple)',
            }}
          >
            {/* Close Button */}
            <Dialog.Close
              className={cn(
                'absolute right-4 top-4 rounded-lg p-2',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                'hover:bg-[var(--gray-100)] dark:hover:bg-[var(--gray-800)]',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2'
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

            {/* Header */}
            <Dialog.Title className="mb-6 text-2xl font-bold text-[var(--text-primary)]">
              Export Image
            </Dialog.Title>

            {/* Error Display */}
            {displayError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">{displayError}</p>
              </div>
            )}

            {/* Format Selection */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-[var(--text-secondary)]">
                Format
              </label>
              <div className="flex gap-3">
                {formatOptions.map((option) => {
                  const isLocked = option.isPro && !isPro;
                  const isSelected = selectedFormat === option.ratio;

                  return (
                    <button
                      key={option.ratio}
                      onClick={() => handleFormatSelect(option.ratio)}
                      disabled={isLocked}
                      className={cn(
                        'relative flex items-center justify-center gap-2',
                        'h-12 px-6 rounded-xl font-medium transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2',
                        isSelected
                          ? 'bg-[var(--brand-primary)] text-white shadow-md'
                          : 'bg-[var(--gray-100)] text-[var(--text-primary)] hover:bg-[var(--gray-200)] dark:bg-[var(--gray-800)] dark:hover:bg-[var(--gray-700)]',
                        isLocked && 'opacity-50 cursor-not-allowed'
                      )}
                      style={{
                        transitionTimingFunction: 'var(--ease-apple)',
                      }}
                    >
                      <span>{option.label}</span>
                      {isSelected && !isLocked && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="3" fill="currentColor" />
                        </svg>
                      )}
                      {isLocked && (
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
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview Area */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-[var(--text-secondary)]">
                Preview
              </label>
              <div
                className={cn(
                  'relative rounded-2xl overflow-hidden',
                  'bg-[var(--gray-50)] dark:bg-[var(--gray-900)]',
                  'border-2 border-[var(--gray-200)] dark:border-[var(--gray-700)]',
                  'aspect-square'
                )}
              >
                {hasPhotos && beforePhoto && afterPhoto ? (
                  <div className="flex h-full w-full">
                    {/* Before Photo */}
                    <div className="relative flex-1 flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={beforePhoto.dataUrl}
                        alt="Before"
                        className="max-w-full max-h-full object-contain"
                      />
                      {showLabels && (
                        <div className="absolute top-2 left-2 px-3 py-1 bg-black/60 text-white text-sm font-medium rounded-lg">
                          Before
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-[var(--gray-300)] dark:bg-[var(--gray-600)]" />

                    {/* After Photo */}
                    <div className="relative flex-1 flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={afterPhoto.dataUrl}
                        alt="After"
                        className="max-w-full max-h-full object-contain"
                      />
                      {showLabels && (
                        <div className="absolute top-2 left-2 px-3 py-1 bg-black/60 text-white text-sm font-medium rounded-lg">
                          After
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[var(--text-secondary)]">
                      Load photos to see preview
                    </p>
                  </div>
                )}

                {/* Watermark (Free users only) */}
                {!isPro && hasPhotos && (
                  <div className="absolute bottom-4 right-4 px-4 py-2 bg-white/90 dark:bg-black/90 text-[var(--text-primary)] text-sm font-light tracking-tight rounded-lg backdrop-blur-sm">
                    svolta
                  </div>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="mb-6 space-y-3">
              {/* Show Labels Toggle */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className={cn(
                    'w-5 h-5 rounded border-2 transition-all duration-200',
                    'border-[var(--gray-300)] dark:border-[var(--gray-600)]',
                    'checked:bg-[var(--brand-primary)] checked:border-[var(--brand-primary)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2',
                    'cursor-pointer'
                  )}
                />
                <span className="text-base text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
                  Add &ldquo;Before/After&rdquo; labels
                </span>
              </label>

              {/* Remove Watermark (Pro only) */}
              <button
                onClick={handleRemoveWatermark}
                disabled={isPro}
                className={cn(
                  'flex items-center gap-3 w-full text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 rounded-lg',
                  !isPro && 'cursor-pointer hover:opacity-80 transition-opacity'
                )}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  {isPro ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--success)]"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
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
                      className="text-[var(--text-secondary)]"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </div>
                <span className="text-base text-[var(--text-primary)]">
                  Remove watermark
                  {!isPro && (
                    <span className="ml-2 text-sm text-[var(--brand-primary)] font-medium">
                      Go Pro
                    </span>
                  )}
                </span>
              </button>

              {/* Add Logo (Pro only) */}
              <button
                onClick={handleAddLogo}
                disabled={isPro}
                className={cn(
                  'flex items-center gap-3 w-full text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 rounded-lg',
                  !isPro && 'cursor-pointer hover:opacity-80 transition-opacity'
                )}
              >
                <div className="flex items-center justify-center w-5 h-5">
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
                    className="text-[var(--text-secondary)]"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="text-base text-[var(--text-primary)]">
                  Add your logo
                  {!isPro && (
                    <span className="ml-2 text-sm text-[var(--brand-primary)] font-medium">
                      Go Pro
                    </span>
                  )}
                </span>
              </button>
            </div>

            {/* Usage Indicator */}
            <div
              className={cn(
                'mb-6 p-4 rounded-xl',
                'bg-[var(--gray-50)] dark:bg-[var(--gray-900)]',
                'border border-[var(--gray-200)] dark:border-[var(--gray-700)]'
              )}
            >
              <p className="text-sm text-[var(--text-secondary)]">{usageText}</p>
            </div>

            {/* Download Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleDownload}
              disabled={!hasPhotos || isExporting}
              loading={isExporting}
              className="w-full mb-6"
            >
              {isExporting ? 'Exporting...' : 'Download PNG'}
            </Button>

            {/* Upgrade Prompt for Free Users */}
            {!isPro && (
              <>
                <div className="border-t border-[var(--gray-200)] dark:border-[var(--gray-700)] my-6" />
                <div className="text-center">
                  <p className="mb-4 text-base text-[var(--text-secondary)]">
                    Want unlimited exports & your logo?
                  </p>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setUpgradeTrigger('limit');
                      setShowUpgradePrompt(true);
                    }}
                    className="w-full"
                  >
                    Upgrade to Pro — £7.99/mo
                  </Button>
                </div>
              </>
            )}
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
