'use client';

import { Landmark, LANDMARK_INDICES } from '@/types/landmarks';

interface LandmarkOverlayProps {
  landmarks: Landmark[] | null;
  width: number;
  height: number;
  visible: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Connections between landmarks to draw skeleton lines
 */
const CONNECTIONS: [number, number][] = [
  // Shoulders
  [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.RIGHT_SHOULDER],

  // Torso - Left side
  [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.LEFT_HIP],

  // Torso - Right side
  [LANDMARK_INDICES.RIGHT_SHOULDER, LANDMARK_INDICES.RIGHT_HIP],

  // Hips
  [LANDMARK_INDICES.LEFT_HIP, LANDMARK_INDICES.RIGHT_HIP],

  // Left leg
  [LANDMARK_INDICES.LEFT_HIP, LANDMARK_INDICES.LEFT_KNEE],
  [LANDMARK_INDICES.LEFT_KNEE, LANDMARK_INDICES.LEFT_ANKLE],

  // Right leg
  [LANDMARK_INDICES.RIGHT_HIP, LANDMARK_INDICES.RIGHT_KNEE],
  [LANDMARK_INDICES.RIGHT_KNEE, LANDMARK_INDICES.RIGHT_ANKLE],
];

/**
 * Visibility thresholds for color coding
 */
const VISIBILITY_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.5,
} as const;

/**
 * Colors for landmarks based on visibility confidence
 */
const LANDMARK_COLORS = {
  HIGH: '#10B981', // Green - visibility > 0.7
  MEDIUM: '#F59E0B', // Yellow - visibility > 0.5
  LOW: '#EF4444', // Red - visibility <= 0.5
} as const;

/**
 * Get color based on landmark visibility
 */
function getColorForVisibility(visibility: number | undefined): string {
  if (!visibility) return LANDMARK_COLORS.LOW;

  if (visibility > VISIBILITY_THRESHOLDS.HIGH) {
    return LANDMARK_COLORS.HIGH;
  } else if (visibility > VISIBILITY_THRESHOLDS.MEDIUM) {
    return LANDMARK_COLORS.MEDIUM;
  } else {
    return LANDMARK_COLORS.LOW;
  }
}

/**
 * Check if landmark is visible enough to render
 */
function isLandmarkVisible(landmark: Landmark | undefined): boolean {
  if (!landmark) return false;
  return (landmark.visibility ?? 0) > VISIBILITY_THRESHOLDS.MEDIUM;
}

/**
 * LandmarkOverlay Component
 *
 * Displays pose landmarks as circles connected by lines,
 * color-coded by confidence level. Overlays on top of photo canvas.
 */
export function LandmarkOverlay({
  landmarks,
  width,
  height,
  visible,
  className = '',
  style,
}: LandmarkOverlayProps) {
  // Don't render if not visible or no landmarks
  if (!visible || !landmarks || landmarks.length === 0) {
    return null;
  }

  return (
    <svg
      className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${className}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        opacity: visible ? 1 : 0,
        ...style,
      }}
    >
      {/* Draw connection lines first (behind landmarks) */}
      <g className="landmark-connections">
        {CONNECTIONS.map(([startIdx, endIdx], idx) => {
          const startLandmark = landmarks[startIdx];
          const endLandmark = landmarks[endIdx];

          // Only draw if both landmarks are visible
          if (!isLandmarkVisible(startLandmark) || !isLandmarkVisible(endLandmark)) {
            return null;
          }

          // Scale normalized coordinates (0-1) to pixel values
          const x1 = startLandmark.x * width;
          const y1 = startLandmark.y * height;
          const x2 = endLandmark.x * width;
          const y2 = endLandmark.y * height;

          // Use the lower visibility for line color
          const minVisibility = Math.min(
            startLandmark.visibility ?? 0,
            endLandmark.visibility ?? 0
          );
          const color = getColorForVisibility(minVisibility);

          return (
            <line
              key={`connection-${idx}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={2.5}
              strokeOpacity={0.7}
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Draw landmark points on top */}
      <g className="landmark-points">
        {landmarks.map((landmark, idx) => {
          // Only render visible landmarks
          if (!isLandmarkVisible(landmark)) {
            return null;
          }

          // Scale normalized coordinates (0-1) to pixel values
          const x = landmark.x * width;
          const y = landmark.y * height;
          const color = getColorForVisibility(landmark.visibility);

          return (
            <g key={`landmark-${idx}`}>
              {/* Outer circle for better visibility */}
              <circle
                cx={x}
                cy={y}
                r={7}
                fill="white"
                fillOpacity={0.3}
              />
              {/* Inner colored circle */}
              <circle
                cx={x}
                cy={y}
                r={6}
                fill={color}
                fillOpacity={0.8}
                stroke="white"
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
