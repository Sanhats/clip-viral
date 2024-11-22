'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createVideoClips } from '@/lib/videoProcessor'

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [clips, setClips] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    try {
      const clipBlobs = await createVideoClips(file)
      const clipUrls = clipBlobs.map(blob => URL.createObjectURL(blob))
      setClips(clipUrls)
    } catch (error) {
      console.error('Error al procesar el video:', error)
    } finally {
      setLoading(false)
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
      {clips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Clips Generados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map((clip, index) => (
              <div key={index} className="border rounded-lg p-4">
                <img src={clip} alt={`Clip ${index + 1}`} className="w-full" />
                <a href={clip} download={`clip_${index + 1}.jpg`} className="mt-2 inline-block text-blue-500 hover:underline">
                  Descargar Clip {index + 1}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

