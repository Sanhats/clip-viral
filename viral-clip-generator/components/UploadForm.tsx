'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { ClipsPanel } from './clips-panel'
import { createVideoClips, combineClips, VideoClip } from '@/lib/videoProcessor'
import { loadFaceDetectionModels } from '@/lib/face-detection'

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
    setClips([]) // Clear previous clips

    try {
      // Intenta cargar los modelos primero
      console.log('Loading face detection models...');
      await loadFaceDetectionModels();
      
      console.log('Starting video processing');
      const videoClips = await createVideoClips(file, 15, (p) => {
        setProgress(p)
        console.log(`Progress: ${p.toFixed(2)}%`)
      })

      if (videoClips.length === 0) {
        throw new Error('No se pudieron generar clips del video')
      }

      setClips(videoClips.sort((a, b) => b.importance - a.importance))
      console.log(`Generated ${videoClips.length} clips`)
    } catch (error) {
      console.error('Error al procesar el video:', error)
      setError(error instanceof Error ? error.message : 'Error al procesar el video. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCombineClips = async () => {
    if (clips.length === 0) return

    try {
      const combinedVideo = await combineClips(clips)
      const url = URL.createObjectURL(combinedVideo)
      const a = document.createElement('a')
      a.href = url
      a.download = 'combined_clip.webm'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al combinar los clips:', error)
      setError('Error al combinar los clips. Por favor, intenta de nuevo.')
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0]
                if (selectedFile) {
                  setFile(selectedFile)
                  setClips([]) // Clear clips when new file is selected
                  setError(null)
                }
              }}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
            <Button type="submit" disabled={!file || loading}>
              {loading ? 'Procesando...' : 'Generar Clips'}
            </Button>
          </form>
          {loading && (
            <div className="space-y-2 mt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-500">Procesando video: {progress.toFixed(2)}%</p>
            </div>
          )}
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </CardContent>
      </Card>

      {clips.length > 0 && (
        <ClipsPanel 
          clips={clips}
          onCombineClips={handleCombineClips}
        />
      )}
    </div>
  )
}

