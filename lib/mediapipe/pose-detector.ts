/**
 * MediaPipe Pose Landmarker Singleton
 * Provides efficient pose detection with GPU acceleration and CPU fallback
 * Self-hosted assets with CDN fallback for reliability
 */

import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

import { poseLogger } from '@/lib/logger';

import {
  type Landmark,
  type PoseResult,
  PoseDetectionError,
  PoseDetectionErrorType,
} from '@/types/landmarks';

import { useMediaPipeLoading } from './loading-store';

// Pinned version for stability
const MEDIAPIPE_VERSION = '0.10.22';

// Local assets (self-hosted, copied during build)
const LOCAL_WASM_PATH = '/mediapipe/wasm';
const LOCAL_MODEL_PATH = '/mediapipe/models/pose_landmarker_lite.task';

// CDN fallback (if local assets unavailable)
const CDN_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const CDN_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// Singleton instance
let poseLandmarker: PoseLandmarker | null = null;
let initializationPromise: Promise<PoseLandmarker> | null = null;
let usingCpuFallback = false;
let usingLocalAssets = false;

/**
 * Check if local MediaPipe assets are available
 * Performs a lightweight HEAD request to avoid downloading
 */
async function checkLocalAssets(): Promise<boolean> {
  try {
    // Check if the WASM loader exists locally
    const response = await fetch(`${LOCAL_WASM_PATH}/vision_wasm_internal.js`, {
      method: 'HEAD',
      cache: 'no-cache',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get asset paths based on availability
 * Prefers local assets, falls back to CDN
 */
async function getAssetPaths(): Promise<{ wasmPath: string; modelPath: string }> {
  const hasLocalAssets = await checkLocalAssets();

  if (hasLocalAssets) {
    poseLogger.info('Using self-hosted MediaPipe assets');
    usingLocalAssets = true;
    return { wasmPath: LOCAL_WASM_PATH, modelPath: LOCAL_MODEL_PATH };
  }

  poseLogger.warn('Local MediaPipe assets not found, using CDN fallback');
  usingLocalAssets = false;
  return { wasmPath: CDN_WASM_URL, modelPath: CDN_MODEL_URL };
}

/**
 * Create PoseLandmarker with specified delegate
 */
async function createPoseLandmarker(
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  modelPath: string,
  delegate: 'GPU' | 'CPU'
): Promise<PoseLandmarker> {
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: modelPath,
      delegate,
    },
    runningMode: 'IMAGE',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

/**
 * Initialize the PoseLandmarker singleton
 * Attempts local assets first, then CDN fallback
 * Attempts GPU first, falls back to CPU if unavailable
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
    const { setLoading, setProgress, setError } = useMediaPipeLoading.getState();

    setLoading(true);
    setProgress(0);

    try {
      setProgress(10);

      // Get asset paths (local or CDN)
      const { wasmPath, modelPath } = await getAssetPaths();
      setProgress(30);

      // Load the vision tasks WASM files
      const vision = await FilesetResolver.forVisionTasks(wasmPath);
      setProgress(60);

      // Try GPU first, fall back to CPU if it fails
      try {
        poseLandmarker = await createPoseLandmarker(vision, modelPath, 'GPU');
        usingCpuFallback = false;
        poseLogger.info('Pose detector initialized with GPU acceleration');
      } catch (gpuError) {
        poseLogger.warn('GPU initialization failed, falling back to CPU:', gpuError);
        poseLandmarker = await createPoseLandmarker(vision, modelPath, 'CPU');
        usingCpuFallback = true;
        poseLogger.info('Pose detector initialized with CPU');
      }

      setProgress(100);
      setLoading(false);

      return poseLandmarker;
    } catch (error) {
      // Reset state on failure
      poseLandmarker = null;
      initializationPromise = null;

      const message = error instanceof Error ? error.message : 'Failed to initialize pose detector';
      setError(message);

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
 * Check if pose detector is using CPU fallback
 */
export function isUsingCpuFallback(): boolean {
  return usingCpuFallback;
}

/**
 * Check if pose detector is using local assets (vs CDN)
 */
export function isUsingLocalAssets(): boolean {
  return usingLocalAssets;
}

/**
 * Detect pose landmarks in an image
 */
export async function detectPose(
  imageSource: HTMLImageElement | HTMLCanvasElement | ImageBitmap
): Promise<PoseResult> {
  const detector = await initializePoseDetector();

  try {
    // Detect pose - PoseLandmarker in IMAGE mode doesn't support regionOfInterest
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
