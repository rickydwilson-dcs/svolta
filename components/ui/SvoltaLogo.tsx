'use client';

import { cn } from '@/lib/utils';

// Brand colors from guidelines
const COLORS = {
  dark: {
    lines: '#C9A0DC',
    head: '#F58529',
    shoulders: '#DD2A7B',
    hips: '#515BD4',
  },
  light: {
    lines: '#5C3D7A',
    head: '#F58529',
    shoulders: '#DD2A7B',
    hips: '#515BD4',
  },
  mono: {
    lines: '#FFFFFF',
    head: '#FFFFFF',
    shoulders: '#FFFFFF',
    hips: '#FFFFFF',
  },
} as const;

type LogoMode = 'dark' | 'light' | 'mono';
type WordmarkSize = 'sm' | 'md' | 'lg' | 'xl';
type WordmarkStyle = 'gradient' | 'solid';

interface SvoltaLogoProps {
  size?: number;
  mode?: LogoMode;
  showWordmark?: boolean;
  showTagline?: boolean;
  wordmarkStyle?: WordmarkStyle;
  className?: string;
}

interface SvoltaWordmarkProps {
  size?: WordmarkSize;
  style?: WordmarkStyle;
  mode?: 'light' | 'dark';
  showTagline?: boolean;
  className?: string;
}

// Lockup sizes from brand guidelines
const LOCKUP_SIZES = {
  xl: { icon: 64, textClass: 'text-4xl', gap: 20 },
  lg: { icon: 44, textClass: 'text-2xl', gap: 16 },
  md: { icon: 32, textClass: 'text-lg', gap: 12 },
  sm: { icon: 24, textClass: 'text-sm', gap: 8 },
} as const;

/**
 * Svolta Logo Mark - Abstract alignment figure
 *
 * Structure:
 * - Head node (top center, largest)
 * - Shoulder bar with nodes
 * - Spine (vertical center)
 * - Hip bar with nodes
 */
export function SvoltaLogo({
  size = 32,
  mode = 'dark',
  showWordmark = false,
  showTagline = false,
  wordmarkStyle = 'gradient',
  className,
}: SvoltaLogoProps) {
  const colors = COLORS[mode];

  // Calculate lockup size based on icon size
  const lockupSize = size >= 64 ? 'xl' : size >= 44 ? 'lg' : size >= 32 ? 'md' : 'sm';
  const lockup = LOCKUP_SIZES[lockupSize];

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="svolta logo"
    >
      {/* Spine (vertical center line) */}
      <line
        x1="50"
        y1="22"
        x2="50"
        y2="78"
        stroke={colors.lines}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Shoulder bar (horizontal) */}
      <line
        x1="25"
        y1="38"
        x2="75"
        y2="38"
        stroke={colors.lines}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Hip bar (horizontal) */}
      <line
        x1="30"
        y1="72"
        x2="70"
        y2="72"
        stroke={colors.lines}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Head node (top center, largest) */}
      <circle cx="50" cy="15" r="8.5" fill={colors.head} />

      {/* Shoulder nodes */}
      <circle cx="25" cy="38" r="5.2" fill={colors.shoulders} />
      <circle cx="75" cy="38" r="5.2" fill={colors.shoulders} />

      {/* Hip nodes */}
      <circle cx="30" cy="72" r="5.2" fill={colors.hips} />
      <circle cx="70" cy="72" r="5.2" fill={colors.hips} />
    </svg>
  );

  if (!showWordmark) {
    return <span className={className}>{mark}</span>;
  }

  return (
    <span
      className={cn('inline-flex items-center', className)}
      style={{ gap: `${lockup.gap}px` }}
    >
      {mark}
      <SvoltaWordmark
        size={lockupSize}
        style={wordmarkStyle}
        mode={mode === 'mono' ? 'dark' : mode === 'dark' ? 'dark' : 'light'}
        showTagline={showTagline}
      />
    </span>
  );
}

/**
 * Svolta Wordmark - Always lowercase
 *
 * Properties from brand guidelines:
 * - Text: "svolta" or "svolta — see change" with tagline
 * - Case: lowercase always
 * - Weight: font-weight: 300 (light)
 * - Tracking: letter-spacing: -0.025em (tight)
 */
export function SvoltaWordmark({
  size = 'md',
  style = 'gradient',
  mode = 'dark',
  showTagline = false,
  className,
}: SvoltaWordmarkProps) {
  const lockup = LOCKUP_SIZES[size];
  const text = showTagline ? 'svolta — see change' : 'svolta';

  const baseClasses = cn(
    'font-light tracking-tight',
    lockup.textClass,
  );

  if (style === 'gradient') {
    return (
      <span
        className={cn(
          baseClasses,
          'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] via-[#8134AF] to-[#515BD4] bg-clip-text text-transparent',
          className
        )}
        style={{ letterSpacing: '-0.025em' }}
      >
        {text}
      </span>
    );
  }

  // Solid style
  return (
    <span
      className={cn(
        baseClasses,
        mode === 'dark' ? 'text-white' : 'text-[#262626]',
        className
      )}
      style={{ letterSpacing: '-0.025em' }}
    >
      {text}
    </span>
  );
}

/**
 * Animated logo mark for special uses (loading states, etc.)
 */
export function SvoltaLogoAnimated({
  size = 32,
  mode = 'dark',
  className,
}: Omit<SvoltaLogoProps, 'showWordmark' | 'wordmarkStyle'>) {
  const colors = COLORS[mode];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="svolta logo"
      className={cn('animate-pulse', className)}
    >
      {/* Spine */}
      <line
        x1="50"
        y1="22"
        x2="50"
        y2="78"
        stroke={colors.lines}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Shoulder bar */}
      <line
        x1="25"
        y1="38"
        x2="75"
        y2="38"
        stroke={colors.lines}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Hip bar */}
      <line
        x1="30"
        y1="72"
        x2="70"
        y2="72"
        stroke={colors.lines}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Head node */}
      <circle cx="50" cy="15" r="8.5" fill={colors.head}>
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Shoulder nodes */}
      <circle cx="25" cy="38" r="5.2" fill={colors.shoulders}>
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="1.5s"
          begin="0.2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="75" cy="38" r="5.2" fill={colors.shoulders}>
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="1.5s"
          begin="0.2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Hip nodes */}
      <circle cx="30" cy="72" r="5.2" fill={colors.hips}>
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="1.5s"
          begin="0.4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="70" cy="72" r="5.2" fill={colors.hips}>
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="1.5s"
          begin="0.4s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export default SvoltaLogo;
