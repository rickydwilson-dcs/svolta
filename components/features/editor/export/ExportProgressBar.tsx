'use client';

import * as React from 'react';

interface ExportProgressBarProps {
  visible: boolean;
  progress: number;
  status: string;
}

export function ExportProgressBar({ visible, progress, status }: ExportProgressBarProps) {
  if (!visible) return null;

  return (
    <div className="px-4 pb-4 space-y-2">
      <div className="w-full bg-[var(--gray-200)] rounded-full h-1 overflow-hidden">
        <div
          className="h-full bg-instagram-gradient rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-[var(--text-tertiary)] text-center">
        {status === 'frames' ? 'Generating frames...' : 'Encoding GIF...'}
      </p>
    </div>
  );
}
