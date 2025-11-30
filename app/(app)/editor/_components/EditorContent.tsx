'use client';

/**
 * Editor Content - Client-only editor component
 * Separated to allow dynamic import without SSR
 */

import { useEditorStore } from '@/stores/editor-store';
import { PhotoPanel } from '@/components/features/editor';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function EditorContent() {
  const {
    beforePhoto,
    afterPhoto,
    showLandmarks,
    setBeforePhoto,
    setAfterPhoto,
    setBeforeLandmarks,
    setAfterLandmarks,
    toggleLandmarks,
    reset,
  } = useEditorStore();

  const hasPhotos = beforePhoto || afterPhoto;

  return (
    <div className="flex flex-col h-screen bg-surface-secondary">
      {/* Editor Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-border-default bg-surface-primary shadow-sm">
        {/* Logo and Title */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">P</span>
            </div>
            <span className="text-xl font-semibold text-text-primary">PoseProof</span>
          </div>
          {hasPhotos && (
            <Button variant="ghost" size="sm" onClick={reset}>
              New Comparison
            </Button>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Export Counter Placeholder */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary border border-border-default">
            <span className="text-sm text-text-secondary">Exports:</span>
            <span className="text-sm font-semibold text-text-primary">3/5</span>
            <button
              className="text-brand-primary hover:text-brand-primary/80 transition-colors"
              title="Upgrade"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </button>
          </div>

          {/* Settings Button */}
          <button
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary hover:text-text-primary"
            title="Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Export Button */}
          <Button
            variant="primary"
            size="sm"
            disabled={!beforePhoto || !afterPhoto}
            className="px-6"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Export
          </Button>
        </div>
      </header>

      {/* Main Editor Area - Two Photo Panels */}
      <main className="flex-1 overflow-hidden">
        <div
          className={cn(
            'h-full grid gap-0',
            'grid-cols-1 lg:grid-cols-2',
            'divide-y lg:divide-y-0 lg:divide-x divide-border-default'
          )}
        >
          {/* Before Photo Panel */}
          <div className="flex flex-col h-full p-6 md:p-8">
            <PhotoPanel
              label="Before"
              photo={beforePhoto}
              onPhotoChange={setBeforePhoto}
              onLandmarksDetected={setBeforeLandmarks}
              showLandmarks={showLandmarks}
              className="h-full"
            />
          </div>

          {/* After Photo Panel */}
          <div className="flex flex-col h-full p-6 md:p-8">
            <PhotoPanel
              label="After"
              photo={afterPhoto}
              onPhotoChange={setAfterPhoto}
              onLandmarksDetected={setAfterLandmarks}
              showLandmarks={showLandmarks}
              className="h-full"
            />
          </div>
        </div>
      </main>

      {/* Controls Bar Placeholder - Phase 3 */}
      {hasPhotos && (
        <footer className="px-6 py-4 border-t border-border-default bg-surface-primary">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Alignment Controls Placeholder */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-text-secondary">
                Alignment Controls:
              </span>
              {beforePhoto?.landmarks && afterPhoto?.landmarks ? (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-secondary border border-border-default">
                  {(['head', 'shoulders', 'hips', 'full'] as const).map((anchor) => (
                    <button
                      key={anchor}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-apple',
                        'hover:bg-surface-primary hover:shadow-sm',
                        'text-text-secondary hover:text-text-primary',
                        'capitalize'
                      )}
                    >
                      {anchor === 'full' ? 'Full Body' : anchor}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-text-secondary italic">
                  Upload both photos to enable alignment
                </span>
              )}
            </div>

            {/* Landmark Toggle - Moved to Controls Bar */}
            {hasPhotos && (
              <Button
                variant={showLandmarks ? 'secondary' : 'ghost'}
                size="sm"
                onClick={toggleLandmarks}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {showLandmarks ? 'Hide' : 'Show'} Landmarks
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
