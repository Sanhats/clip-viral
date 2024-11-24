import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Download } from 'lucide-react'
import type { VideoClip } from "@/lib/videoProcessor"

interface ClipsPanelProps {
  clips: VideoClip[];
  onCombineClips: () => void;
}

export function ClipsPanel({ clips, onCombineClips }: ClipsPanelProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Clips Destacados ({clips.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map((clip, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-3">
                  <video 
                    src={URL.createObjectURL(clip.blob)} 
                    controls 
                    className="w-full rounded-lg aspect-video mb-2"
                  />
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Inicio:</span> {clip.startTime.toFixed(2)}s
                      <br />
                      <span className="font-medium">Duración:</span> {clip.duration.toFixed(2)}s
                      <br />
                      <span className="font-medium">Importancia:</span> {clip.importance.toFixed(2)}
                    </div>
                    <a
                      href={URL.createObjectURL(clip.blob)}
                      download={`clip_${index + 1}.webm`}
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Download className="h-4 w-4" />
                      Descargar Clip {index + 1}
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        {clips.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button onClick={onCombineClips} size="lg">
              Combinar Todos los Clips
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

