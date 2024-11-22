import { NextRequest, NextResponse } from 'next/server'
import { processVideo } from '@/lib/videoProcessor'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('video') as File

  if (!file) {
    return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
  }

  try {
    const clipPaths = await processVideo(file)
    const clips = clipPaths.map(path => `/api/clips/${randomUUID()}.mp4?source=${encodeURIComponent(path)}`)
    return NextResponse.json({ clips })
  } catch (error) {
    console.error('Error al procesar el video:', error)
    return NextResponse.json({ error: 'Error al procesar el video: ' + (error as Error).message }, { status: 500 })
  }
}

