import type { Photo } from '@/types/editor';

/** Create a blob URL from a Blob */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** Check if a string is a blob URL */
export function isBlobUrl(src: string): boolean {
  return src.startsWith('blob:');
}

/** Safely revoke a blob URL (no-op for null, undefined, or non-blob strings) */
export function revokeBlobUrl(src?: string | null): void {
  if (src && isBlobUrl(src)) {
    URL.revokeObjectURL(src);
  }
}

/**
 * Revoke all blob URLs on a Photo object.
 * Guards against double-revoke when dataUrl === originalDataUrl.
 */
export function revokePhotoUrls(photo?: Photo | null): void {
  if (!photo) return;
  revokeBlobUrl(photo.dataUrl);
  // Only revoke originalDataUrl if it's different from dataUrl (prevent double-revoke)
  if (photo.originalDataUrl && photo.originalDataUrl !== photo.dataUrl) {
    revokeBlobUrl(photo.originalDataUrl);
  }
}
