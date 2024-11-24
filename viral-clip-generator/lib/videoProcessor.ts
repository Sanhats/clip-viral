import { detectFaceExpressions, getExpressionScore, loadFaceDetectionModels } from './face-detection';
import type { FaceExpressions } from 'face-api.js';

export interface VideoClip {
  blob: Blob;
  startTime: number;
  duration: number;
  importance: number;
}

function getAverageVolume(array: Uint8Array) {
  const length = array.length;
  let values = 0;
  for (let i = 0; i < length; i++) {
    values += array[i];
  }
  return values / length;
}

function getFrameScore(imageData: ImageData) {
  const data = imageData.data;
  let totalBrightness = 0;
  let totalDifference = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
    
    if (i < data.length - 4) {
      const nextR = data[i + 4];
      const nextG = data[i + 5];
      const nextB = data[i + 6];
      totalDifference += Math.abs(r - nextR) + Math.abs(g - nextG) + Math.abs(b - nextB);
    }
  }
  
  return {
    brightness: totalBrightness / (data.length / 4),
    difference: totalDifference / (data.length / 4)
  };
}

export async function createVideoClips(file: File, clipDuration: number = 15, onProgress: (progress: number) => void): Promise<VideoClip[]> {
  await loadFaceDetectionModels();

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    
    video.onloadedmetadata = async () => {
      try {
        console.log('Video metadata loaded');
        const duration = video.duration;
        console.log(`Video duration: ${duration} seconds`);
        const clips: VideoClip[] = [];
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaElementSource(video);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 480;
        canvas.height = 270;

        const stream = video.captureStream();
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

        let currentTime = 0;
        let clipStartTime = 0;
        let isRecording = false;
        let currentClipBlob: Blob[] = [];
        let currentClipImportance = 0;
        let previousFrameScore = { brightness: 0, difference: 0 };
        const importanceBuffer: number[] = [];
        const bufferSize = 5;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            currentClipBlob.push(event.data);
          }
        };

        recorder.onstop = () => {
          if (currentClipBlob.length > 0 && currentTime - clipStartTime >= 2) {
            const clipBlob = new Blob(currentClipBlob, { type: 'video/webm' });
            clips.push({
              blob: clipBlob,
              startTime: clipStartTime,
              duration: currentTime - clipStartTime,
              importance: currentClipImportance
            });
            console.log(`Clip created: Start: ${clipStartTime.toFixed(2)}, Duration: ${(currentTime - clipStartTime).toFixed(2)}, Importance: ${currentClipImportance.toFixed(2)}`);
          }
          currentClipBlob = [];
          currentClipImportance = 0;
        };

        const processFrame = async () => {
          if (currentTime >= duration) {
            if (isRecording) {
              recorder.stop();
            }
            console.log(`Processing complete. Total clips: ${clips.length}`);
            resolve(clips);
            return;
          }

          analyser.getByteFrequencyData(dataArray);
          const volume = getAverageVolume(dataArray);
          const normalizedVolume = volume / 255;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const frameScore = getFrameScore(imageData);

          const expressions = await detectFaceExpressions(video);
          const expressionScore = getExpressionScore(expressions);

          const brightnessChange = Math.abs(frameScore.brightness - previousFrameScore.brightness) / 255;
          const differenceChange = Math.abs(frameScore.difference - previousFrameScore.difference) / 255;
          previousFrameScore = frameScore;

          const importanceScore = Math.min(100, (
            (normalizedVolume * 30) +
            (brightnessChange * 20) +
            (differenceChange * 20) +
            (expressionScore * 30)
          ));

          importanceBuffer.push(importanceScore);
          if (importanceBuffer.length > bufferSize) {
            importanceBuffer.shift();
          }

          const averageImportance = importanceBuffer.reduce((a, b) => a + b, 0) / importanceBuffer.length;

          console.log(`Current time: ${currentTime.toFixed(2)}, Importance: ${averageImportance.toFixed(2)}`);

          if (averageImportance > 20 && !isRecording) {
            isRecording = true;
            clipStartTime = Math.max(0, currentTime - 1);
            recorder.start();
            console.log(`Started recording at ${clipStartTime.toFixed(2)}`);
          } else if ((averageImportance <= 10 && isRecording && currentTime - clipStartTime >= 3) || 
                     (currentTime - clipStartTime >= clipDuration)) {
            if (isRecording) {
              isRecording = false;
              recorder.stop();
              console.log(`Stopped recording at ${currentTime.toFixed(2)}`);
            }
          }

          if (isRecording) {
            currentClipImportance = Math.max(currentClipImportance, averageImportance);
          }

          currentTime += 0.1;
          video.currentTime = currentTime;
          onProgress((currentTime / duration) * 100);
          requestAnimationFrame(processFrame);
        };

        video.onseeked = () => {
          requestAnimationFrame(processFrame);
        };

        video.onplay = () => {
          console.log('Video playback started');
          processFrame();
        };

        await video.play();
      } catch (error) {
        console.error('Error in createVideoClips:', error);
        reject(error);
      }
    };
    
    video.onerror = (error) => {
      console.error('Error loading video:', error);
      reject(new Error('Error loading video'));
    };
  });
}

export function combineClips(clips: VideoClip[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const sortedClips = clips.sort((a, b) => b.importance - a.importance);
      const combinedBlobs = sortedClips.map(clip => clip.blob);
      const combinedBlob = new Blob(combinedBlobs, { type: 'video/webm' });
      console.log(`Combined ${clips.length} clips into a single video`);
      resolve(combinedBlob);
    } catch (error) {
      console.error('Error in combineClips:', error);
      reject(error);
    }
  });
}

