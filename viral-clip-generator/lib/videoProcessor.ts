export async function createVideoClips(file: File, clipDuration: number = 15): Promise<Blob[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const clips: Blob[] = [];
      let currentTime = 0;

      function captureClip() {
        if (currentTime >= duration) {
          resolve(clips);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        video.currentTime = currentTime;
        video.onseeked = () => {
          ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) clips.push(blob);
            currentTime += clipDuration;
            captureClip();
          }, 'image/jpeg', 0.95);
        };
      }

      captureClip();
    };
    video.onerror = () => reject(new Error('Error loading video'));
  });
}

