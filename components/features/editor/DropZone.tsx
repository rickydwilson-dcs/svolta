'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import { processImage, validateImageFile, type Photo } from '@/lib/utils/image';

interface DropZoneProps {
  label: string;
  onImageLoad: (photo: Photo) => void;
  photo?: Photo | null;
  className?: string;
}

export function DropZone({ label, onImageLoad, photo, className }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Process image
    setIsProcessing(true);
    try {
      const processedPhoto = await processImage(file);
      onImageLoad(processedPhoto);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (!photo && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Label */}
      <div className="mb-3">
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-300 ease-apple overflow-hidden',
          'min-h-[400px] flex items-center justify-center',
          isDragging && 'border-brand-primary bg-brand-primary/5',
          !isDragging && !photo && 'border-border-default hover:border-brand-primary/50 hover:bg-surface-secondary cursor-pointer',
          photo && 'border-transparent',
          error && 'border-red-500 bg-red-50 dark:bg-red-950/20'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/heic,.heic"
          onChange={handleFileInput}
          className="hidden"
          aria-label={`Upload ${label} photo`}
        />

        {/* Content */}
        {isProcessing ? (
          <ProcessingState />
        ) : photo ? (
          <PhotoPreview photo={photo} onRemove={handleRemove} />
        ) : error ? (
          <ErrorState error={error} />
        ) : (
          <EmptyState isDragging={isDragging} />
        )}
      </div>

      {/* Error message below */}
      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

function EmptyState({ isDragging }: { isDragging: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Upload Icon */}
      <div className={cn(
        'mb-4 transition-colors duration-300',
        isDragging ? 'text-brand-primary' : 'text-text-secondary'
      )}>
        <svg
          className="w-16 h-16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>

      {/* Text */}
      <p className={cn(
        'text-lg font-medium mb-2 transition-colors duration-300',
        isDragging ? 'text-brand-primary' : 'text-text-primary'
      )}>
        {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
      </p>
      <p className="text-sm text-text-secondary max-w-xs">
        JPEG, PNG, or HEIC (max 20MB)
      </p>
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12">
      {/* Spinner */}
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-border-default rounded-full"></div>
        <div className="absolute inset-0 border-4 border-brand-primary rounded-full border-t-transparent animate-spin"></div>
      </div>

      {/* Text */}
      <p className="text-lg font-medium text-text-primary mb-1">
        Processing image...
      </p>
      <p className="text-sm text-text-secondary">
        Converting and optimizing
      </p>
    </div>
  );
}

function PhotoPreview({ photo, onRemove }: { photo: Photo; onRemove: (e: React.MouseEvent) => void }) {
  return (
    <div className="relative w-full h-full min-h-[400px] group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.dataUrl}
        alt="Uploaded photo"
        className="w-full h-full object-contain"
      />

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-apple flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Replace button */}
          <button
            onClick={onRemove}
            className="px-6 py-3 bg-white text-slate-900 rounded-xl font-medium hover:bg-slate-100 transition-colors duration-200"
          >
            Replace Photo
          </button>

          {/* Image info */}
          <div className="text-white text-sm text-center">
            <p className="font-medium">{photo.file.name}</p>
            <p className="text-white/80 mt-1">
              {photo.width} × {photo.height}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Error Icon */}
      <div className="mb-4 text-red-500">
        <svg
          className="w-16 h-16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Text */}
      <p className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
        Upload failed
      </p>
      <p className="text-sm text-text-secondary max-w-xs">
        {error}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 text-sm text-brand-primary hover:underline"
      >
        Try again
      </button>
    </div>
  );
}
