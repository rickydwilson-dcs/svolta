'use client';

/**
 * Editor Content - Client-only editor component
 * Separated to allow dynamic import without SSR
 * Instagram-inspired design system
 */

import { useState } from 'react';
import Link from 'next/link';
import { useEditorStore } from '@/stores/editor-store';
import { PhotoPanel, ExportModal } from '@/components/features/editor';
import { Button } from '@/components/ui';
import { SvoltaLogo } from '@/components/ui/SvoltaLogo';

export default function EditorContent() {
  const {
    beforePhoto,
    afterPhoto,
    setBeforePhoto,
    setAfterPhoto,
    setBeforeLandmarks,
    setAfterLandmarks,
    reset,
  } = useEditorStore();

  const [showExportModal, setShowExportModal] = useState(false);

  const hasPhotos = beforePhoto || afterPhoto;
  const hasBothPhotos = beforePhoto && afterPhoto;

  return (
    <div className="flex flex-col h-dvh bg-canvas">
      {/* Floating Header */}
      <header className="floating-header fixed top-0 left-0 right-0 z-40 safe-top">
        <div className="h-14 px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <SvoltaLogo size={32} mode="dark" showWordmark wordmarkStyle="gradient" className="hidden sm:flex" />
            <SvoltaLogo size={32} mode="dark" className="sm:hidden" />
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
              disabled={!hasBothPhotos}
              className="px-5"
              onClick={() => setShowExportModal(true)}
            >
              Export
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
          <div className="relative h-full p-3 sm:p-6">
            <PhotoPanel
              label="Before"
              photo={beforePhoto}
              onPhotoChange={setBeforePhoto}
              onLandmarksDetected={setBeforeLandmarks}
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
          <div className="relative h-full p-3 sm:p-6">
            <PhotoPanel
              label="After"
              photo={afterPhoto}
              onPhotoChange={setAfterPhoto}
              onLandmarksDetected={setAfterLandmarks}
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

          <div className="px-4 pb-6 flex justify-center">
            {/* Mobile Export Button */}
            <Button
              variant="primary"
              size="sm"
              disabled={!hasBothPhotos}
              className="sm:hidden px-5"
              onClick={() => setShowExportModal(true)}
            >
              Export
            </Button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}
