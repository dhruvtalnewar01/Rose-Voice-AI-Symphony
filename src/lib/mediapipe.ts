/**
 * MediaPipe Tasks Vision Hand Landmarker Helper
 * 60 FPS in-browser 21-point 3D Hand Skeleton & Pen-Tip tracking
 */
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

let handLandmarker: HandLandmarker | null = null;

export async function initHandLandmarker(modelPath?: string): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );

  const modelAssetPath =
    modelPath ||
    process.env.NEXT_PUBLIC_HAND_LANDMARKER_MODEL_PATH ||
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 2,
  });

  return handLandmarker;
}
