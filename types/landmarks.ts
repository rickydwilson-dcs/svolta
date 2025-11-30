/**
 * MediaPipe Pose Landmark Types
 * Based on MediaPipe Pose Landmarker API
 */

export interface Landmark {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  z: number;
  visibility: number; // confidence 0-1
}

/**
 * MediaPipe Pose Landmark Indices
 * 33 key body landmarks detected by MediaPipe Pose
 */
export const LANDMARK_INDICES = {
  // Face
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,

  // Upper Body
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,

  // Lower Body
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type LandmarkIndex = typeof LANDMARK_INDICES[keyof typeof LANDMARK_INDICES];

/**
 * Pose detection result from MediaPipe
 */
export interface PoseResult {
  landmarks: Landmark[];
  worldLandmarks?: Landmark[];
}

/**
 * Visibility threshold for filtering landmarks
 */
export const VISIBILITY_THRESHOLD = 0.5;

/**
 * Error types for pose detection
 */
export enum PoseDetectionErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  DETECTION_FAILED = 'DETECTION_FAILED',
  NO_POSE_DETECTED = 'NO_POSE_DETECTED',
  INVALID_IMAGE = 'INVALID_IMAGE',
}

export class PoseDetectionError extends Error {
  constructor(
    public type: PoseDetectionErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'PoseDetectionError';
  }
}
