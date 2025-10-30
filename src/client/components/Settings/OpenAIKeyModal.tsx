import { useState, useEffect } from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { useDispatch, useStore } from '@/store'
import { Modal } from '../Modal'
import { setOpenAIKey, getOpenAIKey } from '@shared/endpoints/ai'

export function OpenAIKeyModal() {
  const { openAIKeyModalOpen } = useStore()
  const dispatch = useDispatch()
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (openAIKeyModalOpen) {
      checkExistingKey()
    }
  }, [openAIKeyModalOpen])

  async function checkExistingKey() {
    try {
      const result = await getOpenAIKey.call()
      setHasKey(result.hasKey)
    } catch (err) {
      console.error('Error checking OpenAI key:', err)
    }
  }

  function onOpenChange(open: boolean) {
    dispatch({ openAIKeyModalOpen: open })
    if (!open) {
      setApiKey('')
      setError(null)
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      setError('Veuillez entrer une clé API')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await setOpenAIKey.call({ apiKey: apiKey.trim() })
      setHasKey(true)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde de la clé')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Configurer Perplexity AI"
      desc="Entrez votre clé API Perplexity pour activer la génération de chansons avec recherche web"
      open={openAIKeyModalOpen}
      onOpenChange={onOpenChange}
      footerButtons={[
        {
          label: loading ? 'Enregistrement...' : 'Enregistrer',
          onClick: handleSave,
          disabled: loading,
          className: 'w-full'
        }
      ]}
    >
      <div className="grid w-full gap-4">
        {hasKey && (
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded text-sm">
            Clé API déjà configurée. Entrez une nouvelle clé pour la remplacer.
          </div>
        )}

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="apiKey">Clé API Perplexity:</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="pplx-..."
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') {
                handleSave()
              }
            }}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
          />
          <p className="text-xs text-gray-500">
            Vous pouvez obtenir une clé API sur{' '}
            <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="underline">
              perplexity.ai/settings/api
            </a>
          </p>
        </div>

        {error && <div className="p-3 bg-red-100 dark:bg-red-900 rounded text-sm">{error}</div>}
      </div>
    </Modal>
  )
}
