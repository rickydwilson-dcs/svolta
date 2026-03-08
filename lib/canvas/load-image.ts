/**
 * Load an image from a data URL
 *
 * Shared utility used by export, GIF export, and preview components.
 *
 * @param dataUrl - Data URL of the image to load
 * @returns Promise<HTMLImageElement> - Loaded image element
 */
export async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    img.src = dataUrl;
  });
}
