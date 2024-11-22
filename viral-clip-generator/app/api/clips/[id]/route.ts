import { NextRequest, NextResponse } from 'next/server'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const start = parseInt(url.searchParams.get('start') || '0')
  const duration = parseInt(url.searchParams.get('duration') || '15')
  const sourcePath = decodeURIComponent(url.searchParams.get('source') || '')

  if (!sourcePath) {
    return NextResponse.json({ error: 'Ruta de origen no proporcionada' }, { status: 400 })
  }

  try {
    const { size } = await stat(sourcePath)
    const range = req.headers.get('range')

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1
      const chunksize = (end - start) + 1
      const file = createReadStream(sourcePath, { start, end })
      const head = {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      }
      return new NextResponse(file as any, { status: 206, headers: head as any })
    } else {
      const head = {
        'Content-Length': size,
        'Content-Type': 'video/mp4',
      }
      const file = createReadStream(sourcePath)
      return new NextResponse(file as any, { headers: head as any })
    }
  } catch (error) {
    console.error('Error al servir el clip:', error)
    return NextResponse.json({ error: 'Error al servir el clip' }, { status: 500 })
  }
}

