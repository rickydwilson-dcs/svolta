'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ExportType } from '@/lib/export-utils';

interface ExportButtonProps {
  hasPhotos: boolean;
  isAnyExporting: boolean;
  exportType: ExportType;
  usageText: string;
  onDownload: () => void;
}

export function ExportButton({
  hasPhotos,
  isAnyExporting,
  exportType,
  usageText,
  onDownload,
}: ExportButtonProps) {
  return (
    <div className="p-4 border-t border-[var(--border-default)]">
      <button
        onClick={onDownload}
        disabled={!hasPhotos || isAnyExporting}
        className={cn(
          'w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200',
          'bg-instagram-gradient',
          'hover:opacity-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-pink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isAnyExporting && 'animate-pulse'
        )}
      >
        {isAnyExporting
          ? exportType === 'gif'
            ? 'Exporting GIF...'
            : 'Exporting...'
          : `Download ${exportType.toUpperCase()}`}
      </button>

      {/* Usage text */}
      <p className="mt-3 text-center text-xs text-[var(--text-tertiary)]">
        {usageText}
      </p>
    </div>
  );
}
