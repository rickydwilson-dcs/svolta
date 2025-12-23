'use client';

/**
 * Editor Content - Client-only editor component
 * Separated to allow dynamic import without SSR
 * Instagram-inspired design system
 */

import { useState } from 'react';
import Link from 'next/link';
import { useEditorStore } from '@/stores/editor-store';
import { PhotoPanel } from '@/components/features/editor';
import { Button, BottomSheet, SegmentedControl } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useCanvasExport } from '@/hooks/useCanvasExport';

export default function EditorContent() {
  const {
    beforePhoto,
    afterPhoto,
    alignment,
    showLandmarks,
    showGrid,
    setBeforePhoto,
    setAfterPhoto,
    setBeforeLandmarks,
    setAfterLandmarks,
    toggleLandmarks,
    toggleGrid,
    reset,
  } = useEditorStore();

  const { isExporting, exportAndDownload } = useCanvasExport();
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [alignmentAnchor, setAlignmentAnchor] = useState('full');
  const [exportFormat, setExportFormat] = useState<'1:1' | '4:5' | '9:16'>('1:1');

  const handleExport = async () => {
    if (!beforePhoto || !afterPhoto) return;

    await exportAndDownload(beforePhoto, afterPhoto, alignment, {
      format: exportFormat,
      resolution: 1080,
      quality: 0.92,
      includeLabels: true,
      watermark: {
        isPro: false, // Free users get watermark
      },
    });

    setShowExportSheet(false);
  };

  const hasPhotos = beforePhoto || afterPhoto;
  const hasBothPhotos = beforePhoto && afterPhoto;

  const alignmentOptions = [
    { value: 'full', label: 'Full Body' },
    { value: 'head', label: 'Head' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'hips', label: 'Hips' },
  ];

  return (
    <div className="flex flex-col h-dvh bg-canvas">
      {/* Floating Header */}
      <header className="floating-header fixed top-0 left-0 right-0 z-40 safe-top">
        <div className="h-14 px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-instagram-gradient rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">P</span>
            </div>
            <span className="text-lg font-semibold text-text hidden sm:inline">PoseProof</span>
          </Link>

          {/* Center Actions */}
          {hasPhotos && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button
                onClick={reset}
                className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
              >
                New
              </button>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Usage Counter */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
              <span className="text-sm text-text-secondary">Exports:</span>
              <span className="text-sm font-semibold text-text">3/5</span>
              <Link
                href="/upgrade"
                className="text-brand-pink hover:text-brand-pink/80 transition-colors"
                title="Upgrade for unlimited"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </Link>
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-secondary hover:text-text"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>

            {/* Export Button */}
            <Button
              variant="primary"
              size="sm"
              disabled={!hasBothPhotos || isExporting}
              className="px-5"
              onClick={() => setShowExportSheet(true)}
            >
              {isExporting ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>Export</>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 pt-14 pb-24 overflow-hidden">
        <div className="h-full grid grid-cols-2 relative">
          {/* Split Divider */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center shadow-sm">
              <svg className="w-3 h-3 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </div>

          {/* Before Photo Panel */}
          <div className={cn('relative h-full p-3 sm:p-6', showGrid && 'grid-overlay')}>
            <PhotoPanel
              label="Before"
              photo={beforePhoto}
              onPhotoChange={setBeforePhoto}
              onLandmarksDetected={setBeforeLandmarks}
              showLandmarks={showLandmarks}
              className="h-full"
            />
            {/* Before Label */}
            {beforePhoto && (
              <div className="absolute top-6 left-6 sm:top-9 sm:left-9 z-10">
                <span className="photo-label photo-label-before">Before</span>
              </div>
            )}
          </div>

          {/* After Photo Panel */}
          <div className={cn('relative h-full p-3 sm:p-6', showGrid && 'grid-overlay')}>
            <PhotoPanel
              label="After"
              photo={afterPhoto}
              onPhotoChange={setAfterPhoto}
              onLandmarksDetected={setAfterLandmarks}
              showLandmarks={showLandmarks}
              className="h-full"
            />
            {/* After Label */}
            {afterPhoto && (
              <div className="absolute top-6 left-6 sm:top-9 sm:left-9 z-10">
                <span className="photo-label photo-label-after">After</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Controls Sheet */}
      {hasPhotos && (
        <div className="sheet-base fixed bottom-0 left-0 right-0 z-30 safe-bottom">
          <div className="drag-handle" />

          <div className="px-4 pb-6 space-y-4">
            {/* Alignment Anchor Selector */}
            {hasBothPhotos && beforePhoto?.landmarks && afterPhoto?.landmarks && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                  Align By
                </label>
                <SegmentedControl
                  options={alignmentOptions}
                  value={alignmentAnchor}
                  onValueChange={setAlignmentAnchor}
                  size="sm"
                />
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center justify-between gap-3">
              {/* Grid Toggle */}
              <button
                onClick={toggleGrid}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  showGrid
                    ? 'bg-brand-pink text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-text-secondary hover:text-text'
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                Grid
              </button>

              {/* Landmarks Toggle */}
              <button
                onClick={toggleLandmarks}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  showLandmarks
                    ? 'bg-brand-purple text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-text-secondary hover:text-text'
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Landmarks
              </button>

              {/* Mobile Export Button */}
              <Button
                variant="primary"
                size="sm"
                disabled={!hasBothPhotos || isExporting}
                className="sm:hidden px-5"
                onClick={() => setShowExportSheet(true)}
              >
                Export
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Bottom Sheet */}
      <BottomSheet
        open={showExportSheet}
        onOpenChange={setShowExportSheet}
        title="Export"
        description="Choose your export format"
      >
        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-3 uppercase tracking-wider">
              Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Square */}
              <button
                onClick={() => setExportFormat('1:1')}
                className={cn('format-card format-square', exportFormat === '1:1' && 'selected')}
              >
                <div className="format-preview" />
                <span className="format-label">Square</span>
                <span className="text-xs text-text-tertiary">1:1</span>
              </button>

              {/* Portrait */}
              <button
                onClick={() => setExportFormat('4:5')}
                className={cn('format-card format-portrait', exportFormat === '4:5' && 'selected')}
              >
                <div className="format-preview" />
                <span className="format-label">Portrait</span>
                <span className="text-xs text-text-tertiary">4:5</span>
              </button>

              {/* Story - PRO only */}
              <button
                onClick={() => setExportFormat('9:16')}
                className={cn('format-card format-story relative', exportFormat === '9:16' && 'selected')}
              >
                <span className="badge-pro absolute -top-1 -right-1">PRO</span>
                <div className="format-preview" />
                <span className="format-label">Story</span>
                <span className="text-xs text-text-tertiary">9:16</span>
              </button>
            </div>
          </div>

          {/* Pro Upsell for Story format */}
          {exportFormat === '9:16' && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand-orange/10 to-brand-pink/10 border border-brand-pink/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-instagram-gradient flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text mb-1">Story format is a Pro feature</p>
                  <p className="text-xs text-text-secondary mb-2">
                    Upgrade to export in 9:16 for Instagram Stories, TikTok, and Reels.
                  </p>
                  <Link
                    href="/upgrade"
                    className="text-sm font-semibold text-brand-pink hover:text-brand-pink/80 transition-colors"
                  >
                    Upgrade to Pro →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          <Button
            variant="primary"
            className="w-full"
            onClick={handleExport}
            loading={isExporting}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Download Image'}
          </Button>

          {/* Trust Badges */}
          <div className="trust-badges">
            <div className="trust-badge">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Processed locally</span>
            </div>
            <div className="trust-badge">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Never uploaded</span>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
