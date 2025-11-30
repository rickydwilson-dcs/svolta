'use client';

import * as React from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useEditorStore } from '@/stores/editor-store';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/utils';
import type { AlignmentSettings } from '@/types/editor';

export interface AlignmentControlsProps {
  className?: string;
  onAutoAlign?: () => void;
}

const AlignmentControls = React.forwardRef<HTMLDivElement, AlignmentControlsProps>(
  ({ className, onAutoAlign }, ref) => {
    const {
      alignment,
      showLandmarks,
      showGrid,
      linkedZoom,
      updateAlignment,
      toggleLandmarks,
      toggleGrid,
      toggleLinkedZoom,
    } = useEditorStore();

    // Handle anchor selection
    const handleAnchorChange = (value: string) => {
      if (value) {
        updateAlignment({ anchor: value as AlignmentSettings['anchor'] });
      }
    };

    // Handle scale change
    const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateAlignment({ scale: Number(e.target.value) });
    };

    // Handle direct scale input
    const handleScaleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!isNaN(value) && value >= 0.5 && value <= 2) {
        updateAlignment({ scale: value });
      }
    };

    // Handle scale adjustment with fine-tuning
    const handleScaleAdjust = (
      delta: number,
      e: React.MouseEvent<HTMLButtonElement>
    ) => {
      const step = e.shiftKey ? 0.1 : 0.01;
      const newScale = Math.max(0.5, Math.min(2, alignment.scale + delta * step));
      updateAlignment({ scale: Number(newScale.toFixed(2)) });
    };

    // Handle offset changes with fine-tuning
    const handleOffsetX = (
      delta: number,
      e?: React.MouseEvent<HTMLButtonElement>
    ) => {
      const step = e?.shiftKey ? 10 : 1;
      updateAlignment({ offsetX: alignment.offsetX + delta * step });
    };

    const handleOffsetY = (
      delta: number,
      e?: React.MouseEvent<HTMLButtonElement>
    ) => {
      const step = e?.shiftKey ? 10 : 1;
      updateAlignment({ offsetY: alignment.offsetY + delta * step });
    };

    // Handle direct offset input
    const handleOffsetXInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!isNaN(value)) {
        updateAlignment({ offsetX: value });
      }
    };

    const handleOffsetYInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!isNaN(value)) {
        updateAlignment({ offsetY: value });
      }
    };

    // Reset to default values
    const handleReset = () => {
      updateAlignment({
        anchor: 'shoulders',
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      });
    };

    return (
      <div
        ref={ref}
        className={cn(
          'w-full rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-md p-6',
          'transition-all duration-300',
          className
        )}
        style={{
          transitionTimingFunction: 'var(--ease-apple)',
        }}
      >
        {/* Anchor Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            Align by:
          </label>
          <ToggleGroup.Root
            type="single"
            value={alignment.anchor}
            onValueChange={handleAnchorChange}
            className="flex flex-wrap gap-2"
          >
            {[
              { value: 'head', label: 'Head' },
              { value: 'shoulders', label: 'Shoulders' },
              { value: 'hips', label: 'Hips' },
              { value: 'full', label: 'Full Body' },
            ].map((option) => (
              <ToggleGroup.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'flex-1 min-w-[80px] px-4 py-2.5 rounded-xl text-sm font-medium',
                  'transition-all duration-200',
                  'border border-[var(--border-default)]',
                  'hover:bg-[var(--gray-100)] dark:hover:bg-[var(--gray-800)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2',
                  'data-[state=on]:bg-[var(--brand-primary)] data-[state=on]:text-white data-[state=on]:border-[var(--brand-primary)]',
                  'data-[state=on]:shadow-md data-[state=on]:hover:bg-[var(--brand-primary)]'
                )}
                style={{
                  transitionTimingFunction: 'var(--ease-apple)',
                }}
              >
                {option.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>

        {/* Scale & Offset Controls */}
        <div className="mt-6 space-y-5">
          {/* Scale Slider with Fine-Tuning */}
          <div className="space-y-3">
            <Slider
              label="Scale"
              showValue
              valueFormatter={(value) => `${value.toFixed(2)}x`}
              min={0.5}
              max={2}
              step={0.1}
              value={alignment.scale}
              onChange={handleScaleChange}
            />
            {/* Fine-tuning controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">Fine-tune:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleScaleAdjust(-1, e)}
                className="w-8 h-8 p-0 text-base"
                aria-label="Decrease scale (hold Shift for 0.1, otherwise 0.01)"
                title="Click: -0.01x | Shift+Click: -0.1x"
              >
                -
              </Button>
              <input
                type="number"
                value={alignment.scale.toFixed(2)}
                onChange={handleScaleInput}
                min={0.5}
                max={2}
                step={0.01}
                className={cn(
                  'w-20 px-2 py-1 text-sm text-center rounded-lg',
                  'bg-[var(--surface-secondary)] border border-[var(--border-default)]',
                  'text-[var(--text-primary)] font-medium',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] focus:border-transparent',
                  'transition-all duration-200'
                )}
                aria-label="Scale value"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleScaleAdjust(1, e)}
                className="w-8 h-8 p-0 text-base"
                aria-label="Increase scale (hold Shift for 0.1, otherwise 0.01)"
                title="Click: +0.01x | Shift+Click: +0.1x"
              >
                +
              </Button>
            </div>
          </div>

          {/* Offset Controls */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Offset
            </label>
            <div className="flex flex-col gap-3">
              {/* Vertical Offset */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-secondary)] min-w-[24px]">Y:</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleOffsetY(-1, e)}
                    className="w-8 h-8 p-0"
                    aria-label="Move down (hold Shift for 10px, otherwise 1px)"
                    title="Click: -1px | Shift+Click: -10px"
                  >
                    ↓
                  </Button>
                  <input
                    type="number"
                    value={alignment.offsetY}
                    onChange={handleOffsetYInput}
                    className={cn(
                      'w-20 px-2 py-1 text-sm text-center rounded-lg',
                      'bg-[var(--surface-secondary)] border border-[var(--border-default)]',
                      'text-[var(--text-primary)] font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] focus:border-transparent',
                      'transition-all duration-200'
                    )}
                    aria-label="Y offset value"
                  />
                  <span className="text-xs text-[var(--text-secondary)] min-w-[20px]">px</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleOffsetY(1, e)}
                    className="w-8 h-8 p-0"
                    aria-label="Move up (hold Shift for 10px, otherwise 1px)"
                    title="Click: +1px | Shift+Click: +10px"
                  >
                    ↑
                  </Button>
                </div>
              </div>

              {/* Horizontal Offset */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-secondary)] min-w-[24px]">X:</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleOffsetX(-1, e)}
                    className="w-8 h-8 p-0"
                    aria-label="Move left (hold Shift for 10px, otherwise 1px)"
                    title="Click: -1px | Shift+Click: -10px"
                  >
                    ←
                  </Button>
                  <input
                    type="number"
                    value={alignment.offsetX}
                    onChange={handleOffsetXInput}
                    className={cn(
                      'w-20 px-2 py-1 text-sm text-center rounded-lg',
                      'bg-[var(--surface-secondary)] border border-[var(--border-default)]',
                      'text-[var(--text-primary)] font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] focus:border-transparent',
                      'transition-all duration-200'
                    )}
                    aria-label="X offset value"
                  />
                  <span className="text-xs text-[var(--text-secondary)] min-w-[20px]">px</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleOffsetX(1, e)}
                    className="w-8 h-8 p-0"
                    aria-label="Move right (hold Shift for 10px, otherwise 1px)"
                    title="Click: +1px | Shift+Click: +10px"
                  >
                    →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Options */}
        <div className="mt-6 space-y-3">
          <Toggle
            label="Show landmarks"
            checked={showLandmarks}
            onChange={toggleLandmarks}
          />
          <Toggle
            label="Show grid"
            checked={showGrid}
            onChange={toggleGrid}
          />
          <Toggle
            label="Link zoom"
            checked={linkedZoom}
            onChange={toggleLinkedZoom}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleReset}
            className="flex-1 min-w-[120px]"
          >
            Reset
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onAutoAlign}
            className="flex-1 min-w-[120px]"
            disabled={!onAutoAlign}
          >
            Auto-align
          </Button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <span className="inline-flex items-center gap-1.5">
                <svg
                  className="w-3 h-3 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                Keyboard shortcuts
              </span>
            </summary>
            <div className="mt-3 space-y-2 text-xs text-[var(--text-secondary)]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-default)] font-mono text-[10px]">
                    ↑↓←→
                  </kbd>
                  <span className="ml-1.5">Move (1px)</span>
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-default)] font-mono text-[10px]">
                    Shift+↑↓←→
                  </kbd>
                  <span className="ml-1.5">Move (10px)</span>
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-default)] font-mono text-[10px]">
                    +/-
                  </kbd>
                  <span className="ml-1.5">Scale (0.01x)</span>
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-default)] font-mono text-[10px]">
                    Shift+/-
                  </kbd>
                  <span className="ml-1.5">Scale (0.1x)</span>
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-default)] font-mono text-[10px]">
                    R
                  </kbd>
                  <span className="ml-1.5">Reset</span>
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-default)] font-mono text-[10px]">
                    A
                  </kbd>
                  <span className="ml-1.5">Auto-align</span>
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-default)] font-mono text-[10px]">
                    L
                  </kbd>
                  <span className="ml-1.5">Toggle landmarks</span>
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-default)] font-mono text-[10px]">
                    G
                  </kbd>
                  <span className="ml-1.5">Toggle grid</span>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Mobile: Stack vertically on small screens */}
        <style jsx>{`
          @media (max-width: 640px) {
            .flex-wrap {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    );
  }
);

AlignmentControls.displayName = 'AlignmentControls';

export { AlignmentControls };
