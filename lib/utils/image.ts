import heic2any from 'heic2any';
import type { Photo } from '@/types/editor';

// Re-export the canonical Photo type
export type { Photo };

/**
 * Process an image file - handles HEIC conversion and scaling
 * @param file - The image file to process
 * @returns Promise<Photo> - Processed photo object
 */
export async function processImage(file: File): Promise<Photo> {
  let processedFile = file;

  // Convert HEIC to JPEG if needed
  if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      });

      // heic2any can return Blob or Blob[]
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      processedFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), {
        type: 'image/jpeg',
      });
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw new Error('Failed to convert HEIC image. Please try a different format.');
    }
  }

  // Read file as data URL
  const dataUrl = await readFileAsDataURL(processedFile);

  // Scale image if needed
  const { dataUrl: scaledDataUrl, width, height } = await scaleImage(dataUrl, 2048);

  return {
    id: generateId(),
    file: processedFile,
    dataUrl: scaledDataUrl,
    width,
    height,
    landmarks: null, // Landmarks detected separately
  };
}

/**
 * Scale an image to fit within max dimension while maintaining aspect ratio
 * @param dataUrl - Base64 data URL of the image
 * @param maxDim - Maximum dimension (width or height)
 * @returns Promise with scaled dataUrl and dimensions
 */
export async function scaleImage(
  dataUrl: string,
  maxDim: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const { width: originalWidth, height: originalHeight } = img;

      // Check if scaling is needed
      if (originalWidth <= maxDim && originalHeight <= maxDim) {
        resolve({
          dataUrl,
          width: originalWidth,
          height: originalHeight,
        });
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      let newWidth = originalWidth;
      let newHeight = originalHeight;

      if (originalWidth > originalHeight) {
        if (originalWidth > maxDim) {
          newWidth = maxDim;
          newHeight = (originalHeight * maxDim) / originalWidth;
        }
      } else {
        if (originalHeight > maxDim) {
          newHeight = maxDim;
          newWidth = (originalWidth * maxDim) / originalHeight;
        }
      }

      // Create canvas and draw scaled image
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to data URL
      const scaledDataUrl = canvas.toDataURL('image/jpeg', 0.9);

      resolve({
        dataUrl: scaledDataUrl,
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}

/**
 * Read a file as a data URL
 * @param file - File to read
 * @returns Promise<string> - Base64 data URL
 */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generate a unique ID for photos
 * @returns string - Unique identifier
 */
function generateId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate image file
 * @param file - File to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
  const maxSize = 20 * 1024 * 1024; // 20MB

  // Check file type
  const isValidType = validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.heic');
  if (!isValidType) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, or HEIC images.',
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 20MB.',
    };
  }

  return { isValid: true };
}
