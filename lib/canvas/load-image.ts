/**
 * Load an image from a URL
 *
 * Shared utility used by export, GIF export, and preview components.
 *
 * @param src - URL of the image to load (blob: or data: URL)
 * @returns Promise<HTMLImageElement> - Loaded image element
 */
export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    img.src = src;
  });
}
