import { useState } from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { useDispatch, useStore } from '@/store'
import { Modal } from '../Modal'
import { generateSong, getOpenAIKey } from '@shared/endpoints/ai'

export function AISongSearchModal() {
  const { aiSearchOpen } = useStore()
  const dispatch = useDispatch()
  const [songName, setSongName] = useState('')
  const [artistName, setArtistName] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onOpenChange(open: boolean) {
    dispatch({ aiSearchOpen: open })
    if (!open) {
      setSongName('')
      setArtistName('')
      setTags('')
      setError(null)
    }
  }

  async function handleGenerate() {
    if (!songName.trim() || !artistName.trim()) {
      setError('Veuillez entrer le nom de la chanson et l\'artiste')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First check if API key is configured
      const keyCheck = await getOpenAIKey.call()
      if (!keyCheck.hasKey) {
        setError('Clé API Perplexity non configurée. Veuillez d\'abord configurer votre clé.')
        setLoading(false)
        return
      }

      const result = await generateSong.call({
        songName: songName.trim(),
        artistName: artistName.trim(),
        tags: tags.trim()
      })

      // Store the generated song in a temporary state and open preview
      // We'll pass it through a global state or props
      dispatch({
        aiSearchOpen: false,
        aiPreviewOpen: true
      })

      // Store the result in localStorage temporarily for the preview modal
      localStorage.setItem('aiGeneratedSong', JSON.stringify(result))
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Erreur lors de la génération de la chanson'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Ajouter une chanson avec IA"
      desc="Entrez les détails de la chanson et l'IA trouvera les paroles et accords"
      open={aiSearchOpen}
      onOpenChange={onOpenChange}
      footerButtons={[
        {
          label: loading ? 'Génération en cours...' : 'Générer',
          onClick: handleGenerate,
          disabled: loading,
          className: 'w-full'
        }
      ]}
    >
      <div className="grid w-full gap-4">
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded text-sm">
          ⚠️ <strong>Important:</strong> Cette fonction recherche des chansons sur internet. Vérifiez toujours la précision des paroles et accords. Assurez-vous d'avoir le droit d'utiliser le contenu pour un usage personnel.
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="songName">Nom de la chanson *</Label>
          <Input
            id="songName"
            type="text"
            value={songName}
            onChange={(e) => setSongName(e.target.value)}
            placeholder="ex: Let It Be"
            disabled={loading}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
          />
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="artistName">Artiste *</Label>
          <Input
            id="artistName"
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="ex: The Beatles"
            disabled={loading}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' && !loading) {
                handleGenerate()
              }
            }}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
          />
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="tags">Tags (optionnel)</Label>
          <Input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="ex: rock classic ballad"
            disabled={loading}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
          />
          <p className="text-xs text-gray-500">Tags séparés par des espaces</p>
        </div>

        {loading && (
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded text-sm">
            Recherche et génération en cours... Cela peut prendre 10-30 secondes.
          </div>
        )}

        {error && <div className="p-3 bg-red-100 dark:bg-red-900 rounded text-sm">{error}</div>}
      </div>
    </Modal>
  )
}
