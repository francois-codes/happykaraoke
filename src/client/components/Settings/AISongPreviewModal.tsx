import { useState, useEffect } from 'react'
import { useDispatch, useStore } from '@/store'
import { Modal } from '../Modal'
import { saveSong } from '@shared/endpoints/ai'

interface GeneratedSong {
  title: string
  author: string
  key: string
  tags: string
  content: string
  filename: string
}

export function AISongPreviewModal() {
  const { aiPreviewOpen } = useStore()
  const dispatch = useDispatch()
  const [song, setSong] = useState<GeneratedSong | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (aiPreviewOpen) {
      // Load the generated song from localStorage
      const stored = localStorage.getItem('aiGeneratedSong')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setSong(parsed)
        } catch (err) {
          console.error('Error parsing stored song:', err)
          setError('Erreur lors du chargement de la chanson')
        }
      }
    }
  }, [aiPreviewOpen])

  function onOpenChange(open: boolean) {
    dispatch({ aiPreviewOpen: open })
    if (!open) {
      setSong(null)
      setError(null)
      localStorage.removeItem('aiGeneratedSong')
    }
  }

  async function handleSave() {
    if (!song) return

    setLoading(true)
    setError(null)

    try {
      await saveSong.call({
        filename: song.filename,
        content: song.content
      })

      // Success! Close the modal
      onOpenChange(false)

      // Show success message (you could add a toast notification here)
      alert(`Chanson "${song.title}" ajoutée avec succès!`)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde de la chanson')
    } finally {
      setLoading(false)
    }
  }

  function handleDiscard() {
    onOpenChange(false)
  }

  if (!song) {
    return null
  }

  return (
    <Modal
      title="Aperçu de la chanson générée"
      desc="Vérifiez la chanson et sauvegardez-la dans votre catalogue"
      open={aiPreviewOpen}
      onOpenChange={onOpenChange}
      footerButtons={[
        {
          label: 'Annuler',
          onClick: handleDiscard,
          disabled: loading
        },
        {
          label: loading ? 'Sauvegarde...' : 'Sauvegarder',
          onClick: handleSave,
          disabled: loading
        }
      ]}
    >
      <div className="grid w-full gap-4">
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded text-sm">
          ⚠️ <strong>Vérification requise:</strong> Assurez-vous que les paroles et accords sont corrects avant de sauvegarder.
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <div>
            <span className="text-xs text-gray-500">Titre:</span>
            <p className="font-medium">{song.title}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Artiste:</span>
            <p className="font-medium">{song.author}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Tonalité:</span>
            <p className="font-medium">{song.key}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Tags:</span>
            <p className="font-medium">{song.tags || 'Aucun'}</p>
          </div>
        </div>

        <div className="border rounded p-4 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-mono text-sm">{song.content}</pre>
        </div>

        <div className="text-xs text-gray-500">
          <p>Fichier: {song.filename}</p>
          <p className="mt-2">
            La chanson sera sauvegardée dans votre dossier de chansons et apparaîtra automatiquement dans la liste.
          </p>
        </div>

        {error && <div className="p-3 bg-red-100 dark:bg-red-900 rounded text-sm">{error}</div>}
      </div>
    </Modal>
  )
}
