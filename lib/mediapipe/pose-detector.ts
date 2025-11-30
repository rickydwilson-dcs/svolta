/**
 * MediaPipe Pose Landmarker Singleton
 * Provides efficient pose detection with GPU acceleration
 */

import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

import {
  type Landmark,
  type PoseResult,
  PoseDetectionError,
  PoseDetectionErrorType,
} from '@/types/landmarks';

// Singleton instance
let poseLandmarker: PoseLandmarker | null = null;
let initializationPromise: Promise<PoseLandmarker> | null = null;

/**
 * Initialize the PoseLandmarker singleton
 * Uses dynamic import for code splitting
 */
export async function initializePoseDetector(): Promise<PoseLandmarker> {
  // Return existing instance if available
  if (poseLandmarker) {
    return poseLandmarker;
  }

  // Return pending initialization if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Load the vision tasks WASM files
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Create the pose landmarker with GPU delegate
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numPoses: 1, // Only detect one person
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      return poseLandmarker;
    } catch (error) {
      // Reset state on failure
      poseLandmarker = null;
      initializationPromise = null;

      throw new PoseDetectionError(
        PoseDetectionErrorType.INITIALIZATION_FAILED,
        'Failed to initialize pose detector. Please check your internet connection and try again.',
        error
      );
    }
  })();

  return initializationPromise;
}

/**
 * Detect pose landmarks in an image
 */
export async function detectPose(
  imageSource: HTMLImageElement | HTMLCanvasElement | ImageBitmap
): Promise<PoseResult> {
  const detector = await initializePoseDetector();

  try {
    const result: PoseLandmarkerResult = detector.detect(imageSource);

    if (!result.landmarks || result.landmarks.length === 0) {
      throw new PoseDetectionError(
        PoseDetectionErrorType.NO_POSE_DETECTED,
        'No pose detected in the image. Please ensure a person is visible in the photo.'
      );
    }

    // Convert to our Landmark type
    const landmarks: Landmark[] = result.landmarks[0].map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility ?? 0,
    }));

    // Include world landmarks if available
    const worldLandmarks = result.worldLandmarks?.[0]?.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility ?? 0,
    }));

    return {
      landmarks,
      worldLandmarks,
    };
  } catch (error) {
    if (error instanceof PoseDetectionError) {
      throw error;
    }

    throw new PoseDetectionError(
      PoseDetectionErrorType.DETECTION_FAILED,
      'Failed to detect pose in the image. Please try with a different photo.',
      error
    );
  }
}

/**
 * Detect pose from an image data URL
 */
export async function detectPoseFromDataUrl(
  dataUrl: string
): Promise<PoseResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      try {
        const result = await detectPose(img);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(
        new PoseDetectionError(
          PoseDetectionErrorType.INVALID_IMAGE,
          'Failed to load image for pose detection.'
        )
      );
    };

    img.src = dataUrl;
  });
}

/**
 * Check if the pose detector is ready
 */
export function isPoseDetectorReady(): boolean {
  return poseLandmarker !== null;
}

/**
 * Close and clean up the pose detector
 */
export function closePoseDetector(): void {
  if (poseLandmarker) {
    poseLandmarker.close();
    poseLandmarker = null;
    initializationPromise = null;
  }
}
