'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { createVideoClips, combineClips, VideoClip } from '@/lib/videoProcessor'

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [clips, setClips] = useState<VideoClip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError(null)
    setProgress(0)
    try {
      console.log('Starting video processing');
      const videoClips = await createVideoClips(file, 15, (p) => {
        setProgress(p);
        console.log(`Progress: ${p.toFixed(2)}%`);
      })
      setClips(videoClips.sort((a, b) => b.importance - a.importance));
      console.log(`Generated ${videoClips.length} clips`);
    } catch (error) {
      console.error('Error al procesar el video:', error)
      setError('Error al procesar el video. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCombineClips = async () => {
    try {
      const combinedVideo = await combineClips(clips)
      const url = URL.createObjectURL(combinedVideo)
      const a = document.createElement('a')
      a.href = url
      a.download = 'combined_clip.webm'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al combinar los clips:', error)
      setError('Error al combinar los clips. Por favor, intenta de nuevo.')
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
        />
        <Button type="submit" disabled={!file || loading}>
          {loading ? 'Procesando...' : 'Generar Clips'}
        </Button>
      </form>
      {loading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-500">Procesando video: {progress.toFixed(2)}%</p>
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}
      {clips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Clips Destacados ({clips.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map((clip, index) => (
              <div key={index} className="border rounded-lg p-4">
                <video src={URL.createObjectURL(clip.blob)} controls className="w-full" />
                <p>Inicio: {clip.startTime.toFixed(2)}s, Duración: {clip.duration.toFixed(2)}s</p>
                <p>Importancia: {clip.importance.toFixed(2)}</p>
                <a href={URL.createObjectURL(clip.blob)} download={`clip_${index + 1}.webm`} className="mt-2 inline-block text-blue-500 hover:underline">
                  Descargar Clip {index + 1}
                </a>
              </div>
            ))}
          </div>
          <Button onClick={handleCombineClips}>Combinar Clips</Button>
        </div>
      )}
    </div>
  )
}

