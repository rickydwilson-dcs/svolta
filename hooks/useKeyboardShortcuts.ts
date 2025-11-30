/**
 * Keyboard shortcuts hook for editor controls
 * Provides keyboard shortcuts for alignment, scale, and toggle controls
 */

import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';

export interface KeyboardShortcutsOptions {
  enabled?: boolean;
  onAutoAlign?: () => void;
}

/**
 * Hook to handle keyboard shortcuts for the editor
 *
 * Shortcuts:
 * - Arrow keys: Move offset (1px)
 * - Shift + Arrow: Move offset (10px)
 * - +/-: Scale up/down (0.01)
 * - Shift + +/-: Scale up/down (0.1)
 * - R: Reset alignment
 * - A: Auto-align
 * - L: Toggle landmarks
 * - G: Toggle grid
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true, onAutoAlign } = options;

  const {
    alignment,
    updateAlignment,
    toggleLandmarks,
    toggleGrid,
  } = useEditorStore();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Determine step sizes based on shift key
      const offsetStep = e.shiftKey ? 10 : 1;
      const scaleStep = e.shiftKey ? 0.1 : 0.01;

      // Handle keyboard shortcuts
      switch (e.key) {
        // Arrow keys: Move offset
        case 'ArrowUp':
          e.preventDefault();
          updateAlignment({ offsetY: alignment.offsetY - offsetStep });
          break;

        case 'ArrowDown':
          e.preventDefault();
          updateAlignment({ offsetY: alignment.offsetY + offsetStep });
          break;

        case 'ArrowLeft':
          e.preventDefault();
          updateAlignment({ offsetX: alignment.offsetX - offsetStep });
          break;

        case 'ArrowRight':
          e.preventDefault();
          updateAlignment({ offsetX: alignment.offsetX + offsetStep });
          break;

        // +/- keys: Scale
        case '+':
        case '=': // Also handle = key (same key as + without shift)
          e.preventDefault();
          updateAlignment({
            scale: Math.min(2, alignment.scale + scaleStep)
          });
          break;

        case '-':
        case '_': // Also handle _ key (same key as - with shift)
          e.preventDefault();
          updateAlignment({
            scale: Math.max(0.5, alignment.scale - scaleStep)
          });
          break;

        // Letter shortcuts
        case 'r':
        case 'R':
          e.preventDefault();
          // Reset alignment to defaults
          updateAlignment({
            anchor: 'shoulders',
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          });
          break;

        case 'a':
        case 'A':
          e.preventDefault();
          // Trigger auto-align if callback provided
          if (onAutoAlign) {
            onAutoAlign();
          }
          break;

        case 'l':
        case 'L':
          e.preventDefault();
          toggleLandmarks();
          break;

        case 'g':
        case 'G':
          e.preventDefault();
          toggleGrid();
          break;

        default:
          // Do nothing for other keys
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    alignment,
    updateAlignment,
    toggleLandmarks,
    toggleGrid,
    onAutoAlign,
  ]);
}
