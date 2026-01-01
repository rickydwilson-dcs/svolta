/**
 * BackgroundSettings Component Usage Example
 * 
 * This component allows users to select background options for their exported photos.
 * It's a Pro-only feature that works with the background removal system.
 * 
 * Location: components/features/editor/BackgroundSettings.tsx
 */

import { BackgroundSettings } from './BackgroundSettings';
import { useEditorStore } from '@/stores/editor-store';

/**
 * Example 1: Basic usage in an editor panel
 */
export function EditorPanelExample() {
  const { beforePhoto, afterPhoto } = useEditorStore();
  
  // Check if backgrounds have been removed from both photos
  const hasRemovedBackground = 
    beforePhoto?.hasBackgroundRemoved && 
    afterPhoto?.hasBackgroundRemoved;

  return (
    <div className="p-6">
      <BackgroundSettings
        disabled={false}
        hasRemovedBackground={hasRemovedBackground ?? false}
        onUpgradeClick={() => {
          // Navigate to upgrade page or show upgrade modal
          console.log('Show upgrade prompt');
        }}
      />
    </div>
  );
}

/**
 * Example 2: Usage in ExportModal
 * Show background settings before export
 */
export function ExportModalExample() {
  const { beforePhoto, afterPhoto } = useEditorStore();
  
  const hasRemovedBackground = 
    beforePhoto?.hasBackgroundRemoved && 
    afterPhoto?.hasBackgroundRemoved;

  return (
    <div className="space-y-6">
      <h2>Export Settings</h2>
      
      {/* Background settings section */}
      <BackgroundSettings
        disabled={false}
        hasRemovedBackground={hasRemovedBackground ?? false}
        onUpgradeClick={() => {
          // Show upgrade prompt
        }}
      />
      
      {/* Other export settings... */}
    </div>
  );
}

/**
 * Example 3: Handling background changes
 * The component automatically updates the editor store when settings change
 */
export function BackgroundChangeExample() {
  const { backgroundSettings, beforePhoto, afterPhoto } = useEditorStore();
  
  // The backgroundSettings state is automatically updated by BackgroundSettings component
  // You can use it to apply backgrounds during export:
  
  const handleExport = async () => {
    // During export, use the backgroundSettings from store
    console.log('Current background settings:', backgroundSettings);
    
    // Example settings:
    // - { type: 'original' } - Keep original background
    // - { type: 'transparent' } - Transparent PNG
    // - { type: 'solid', color: '#ffffff' } - White background
    // - { type: 'gradient', gradient: GradientPreset } - Gradient background
    
    // The export logic will use these settings to render the final image
  };
  
  return (
    <button onClick={handleExport}>
      Export with {backgroundSettings.type} background
    </button>
  );
}

/**
 * Component Features:
 * 
 * 1. Pro Lock:
 *    - Shows lock icon for free users
 *    - Calls onUpgradeClick when free users try to change settings
 * 
 * 2. Background Types:
 *    - Original: Keep original background
 *    - Transparent: Export with transparent background (PNG)
 *    - Solid: Choose from preset colors or custom color picker
 *    - Gradient: Choose from 12 professional gradient presets
 * 
 * 3. Disabled State:
 *    - Shows info message if hasRemovedBackground is false
 *    - User must remove backgrounds first
 * 
 * 4. Styling:
 *    - Apple-style design with rounded corners and smooth transitions
 *    - Visual previews for gradients
 *    - Color swatches for solid colors
 *    - Selected state indicators (checkmarks)
 * 
 * 5. Integration:
 *    - Reads/writes to useEditorStore backgroundSettings
 *    - Checks user Pro status via useUserStore
 *    - Works with existing Photo type (hasBackgroundRemoved field)
 */
