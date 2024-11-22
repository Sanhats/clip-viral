import { UploadForm } from '../components/UploadForm'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Generador de Clips Virales</h1>
      <UploadForm />
    </div>
  )
}

