/**
 * Example usage of AlignmentControls component
 *
 * This file demonstrates how to integrate AlignmentControls into the editor
 */

import { AlignmentControls } from './AlignmentControls';
import { useEditorStore } from '@/stores/editor-store';

export function EditorExample() {
  const { beforePhoto, afterPhoto } = useEditorStore();

  // Auto-align function that calculates optimal alignment
  const handleAutoAlign = async () => {
    // TODO: Implement auto-alignment logic using landmarks
    // This would calculate the best anchor point and scale
    // based on the detected pose landmarks in both photos
    console.log('Auto-align triggered');

    // Example implementation:
    // 1. Get landmarks from both photos
    // 2. Calculate optimal anchor point (shoulders, hips, etc.)
    // 3. Calculate scale factor to match body proportions
    // 4. Update alignment settings in store
  };

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Before Photo Panel */}
        <div className="lg:col-span-1">
          {/* PhotoPanel component would go here */}
        </div>

        {/* After Photo Panel */}
        <div className="lg:col-span-1">
          {/* PhotoPanel component would go here */}
        </div>

        {/* Alignment Controls */}
        <div className="lg:col-span-1">
          <AlignmentControls
            onAutoAlign={
              beforePhoto?.landmarks && afterPhoto?.landmarks
                ? handleAutoAlign
                : undefined
            }
            className="sticky top-6"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile Layout Example
 *
 * On mobile, stack controls below the photos
 */
export function EditorMobileExample() {
  const { beforePhoto, afterPhoto } = useEditorStore();

  const handleAutoAlign = async () => {
    console.log('Auto-align triggered');
  };

  return (
    <div className="container mx-auto p-4">
      {/* Photo Panels */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>{/* Before PhotoPanel */}</div>
        <div>{/* After PhotoPanel */}</div>
      </div>

      {/* Alignment Controls */}
      <AlignmentControls
        onAutoAlign={
          beforePhoto?.landmarks && afterPhoto?.landmarks
            ? handleAutoAlign
            : undefined
        }
      />
    </div>
  );
}
