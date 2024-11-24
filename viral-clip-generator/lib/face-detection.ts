import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export interface ExpressionScore {
  happy: number;
  surprised: number;
  angry: number;
  fearful: number;
  disgusted: number;
  sad: number;
  neutral: number;
}

export async function loadFaceDetectionModels() {
  if (modelsLoaded) return;
  
  try {
    console.log('Loading face detection models...');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models')
    ]);
    
    modelsLoaded = true;
    console.log('Face detection models loaded successfully');
  } catch (error) {
    console.error('Error loading face detection models:', error);
    throw new Error('No se pudieron cargar los modelos de detección facial. Por favor, verifica tu conexión e intenta de nuevo.');
  }
}

export async function detectFaceExpressions(video: HTMLVideoElement): Promise<faceapi.FaceExpressions | null> {
  try {
    const detections = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    return detections?.expressions || null;
  } catch (error) {
    console.error('Error detecting face expressions:', error);
    return null;
  }
}

export function getExpressionScore(expressions: faceapi.FaceExpressions | null): number {
  if (!expressions) return 0;

  // Weights for different expressions
  const weights = {
    happy: 1.0,
    surprised: 0.8,
    angry: 0.6,
    fearful: 0.4,
    disgusted: 0.3,
    sad: 0.2,
    neutral: 0.1
  };

  // Calculate weighted score
  return Object.entries(expressions).reduce((score, [expression, probability]) => {
    return score + (probability * (weights[expression as keyof typeof weights] || 0));
  }, 0);
}

