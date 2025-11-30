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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Editor Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-primary">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-text-primary">Editor</h1>
          {hasPhotos && (
            <Button variant="ghost" size="sm" onClick={reset}>
              New Comparison
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Landmark Toggle */}
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
              Landmarks
            </Button>
          )}

          {/* Export Button */}
          <Button
            variant="primary"
            size="sm"
            disabled={!beforePhoto || !afterPhoto}
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

      {/* Main Editor Area */}
      <main className="flex-1 overflow-hidden p-6 bg-surface-secondary">
        <div
          className={cn(
            'grid gap-6 h-full',
            'grid-cols-1 lg:grid-cols-2'
          )}
        >
          {/* Before Photo Panel */}
          <PhotoPanel
            label="Before"
            photo={beforePhoto}
            onPhotoChange={setBeforePhoto}
            onLandmarksDetected={setBeforeLandmarks}
            showLandmarks={showLandmarks}
            className="h-full"
          />

          {/* After Photo Panel */}
          <PhotoPanel
            label="After"
            photo={afterPhoto}
            onPhotoChange={setAfterPhoto}
            onLandmarksDetected={setAfterLandmarks}
            showLandmarks={showLandmarks}
            className="h-full"
          />
        </div>
      </main>

      {/* Controls Bar - Phase 3 */}
      {hasPhotos && beforePhoto?.landmarks && afterPhoto?.landmarks && (
        <footer className="px-6 py-4 border-t border-border-default bg-surface-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">
                Align by:
              </span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-secondary">
                {(['head', 'shoulders', 'hips', 'full'] as const).map((anchor) => (
                  <button
                    key={anchor}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                      'hover:bg-surface-primary',
                      'capitalize'
                    )}
                  >
                    {anchor === 'full' ? 'Full Body' : anchor}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm text-text-secondary">
              Alignment controls coming in Phase 3
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
