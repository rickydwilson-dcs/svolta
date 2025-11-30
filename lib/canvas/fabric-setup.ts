/**
 * Fabric.js Canvas Setup Utilities
 */

import { Canvas, FabricImage, type TOptions, type CanvasOptions } from 'fabric';

/**
 * Default canvas configuration
 */
export const DEFAULT_CANVAS_OPTIONS: Partial<TOptions<CanvasOptions>> = {
  selection: false,
  renderOnAddRemove: false, // Manual render for performance
  preserveObjectStacking: true,
  enableRetinaScaling: true,
  backgroundColor: '#1e293b', // Dark background for editor
};

/**
 * Create a new Fabric.js canvas instance
 */
export function createCanvas(
  element: HTMLCanvasElement,
  options: Partial<TOptions<CanvasOptions>> = {}
): Canvas {
  const canvas = new Canvas(element, {
    ...DEFAULT_CANVAS_OPTIONS,
    ...options,
  });

  return canvas;
}

/**
 * Load an image into Fabric.js
 */
export async function loadFabricImage(
  dataUrl: string,
  options: Partial<{ scaleX: number; scaleY: number; left: number; top: number }> = {}
): Promise<FabricImage> {
  const img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });

  img.set({
    selectable: false,
    evented: false,
    ...options,
  });

  return img;
}

/**
 * Fit an image to a container while maintaining aspect ratio
 */
export function calculateFitScale(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding = 20
): { scale: number; offsetX: number; offsetY: number } {
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  const scaleX = availableWidth / imageWidth;
  const scaleY = availableHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY);

  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;

  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  return { scale, offsetX, offsetY };
}

/**
 * Dispose of a canvas and clean up resources
 */
export function disposeCanvas(canvas: Canvas | null): void {
  if (canvas) {
    canvas.dispose();
  }
}
