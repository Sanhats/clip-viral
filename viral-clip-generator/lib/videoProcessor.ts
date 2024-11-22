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

function getAverageRGB(imageData: ImageData) {
  const data = imageData.data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const count = data.length / 4;
  return {
    r: r / count,
    g: g / count,
    b: b / count
  };
}

export async function createVideoClips(file: File, clipDuration: number = 15, onProgress: (progress: number) => void): Promise<VideoClip[]> {
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
        analyser.connect(audioContext.destination);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 300;  // Reduced size for performance
        canvas.height = 150;

        const stream = video.captureStream();
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

        let currentTime = 0;
        let clipStartTime = 0;
        let isRecording = false;
        let currentClipBlob: Blob[] = [];
        let currentClipImportance = 0;
        let lastRGB = { r: 0, g: 0, b: 0 };

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            currentClipBlob.push(event.data);
          }
        };

        recorder.onstop = () => {
          const clipBlob = new Blob(currentClipBlob, { type: 'video/webm' });
          clips.push({
            blob: clipBlob,
            startTime: clipStartTime,
            duration: currentTime - clipStartTime,
            importance: currentClipImportance
          });
          currentClipBlob = [];
          currentClipImportance = 0;
          console.log(`Clip created: Start: ${clipStartTime}, Duration: ${currentTime - clipStartTime}, Importance: ${currentClipImportance}`);
        };

        const processFrame = () => {
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

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const rgb = getAverageRGB(imageData);

          const colorChange = Math.abs(rgb.r - lastRGB.r) + Math.abs(rgb.g - lastRGB.g) + Math.abs(rgb.b - lastRGB.b);
          lastRGB = rgb;

          const importanceScore = volume + colorChange;

          console.log(`Current time: ${currentTime.toFixed(2)}, Importance: ${importanceScore.toFixed(2)}`);

          if (importanceScore > 50 && !isRecording) {
            isRecording = true;
            clipStartTime = currentTime;
            recorder.start();
            console.log(`Started recording at ${clipStartTime}`);
          } else if ((importanceScore <= 50 && isRecording) || (currentTime - clipStartTime >= clipDuration)) {
            if (isRecording) {
              isRecording = false;
              recorder.stop();
              console.log(`Stopped recording at ${currentTime}`);
            }
          }

          if (isRecording) {
            currentClipImportance = Math.max(currentClipImportance, importanceScore);
          }

          currentTime += 0.1;
          video.currentTime = currentTime;
          onProgress((currentTime / duration) * 100);
          requestAnimationFrame(processFrame);
        };

        video.onseeked = () => {
          console.log(`Video seeked to ${video.currentTime}`);
          processFrame();
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

