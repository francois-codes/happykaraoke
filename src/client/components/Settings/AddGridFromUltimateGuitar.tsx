import { fetchGridEditorStatus, importUltimateGuitar, type ImportResult } from '@shared/endpoints/gridEditor'
import { AxiosError } from 'axios'
import { type KeyboardEvent, type ReactElement, useEffect, useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SettingEmoji } from './SettingEmoji'

function errorMessage(e: unknown): string {
  if (e instanceof AxiosError) {
    const data: unknown = e.response?.data
    if (typeof data === 'object' && data !== null && 'message' in data) return String(data.message)
  }
  return e instanceof Error ? e.message : String(e)
}

/** Typing the link must not trigger the app's keyboard shortcuts. */
function stopShortcuts(event: KeyboardEvent): void {
  if (event.key !== 'Escape') event.stopPropagation()
}

/**
 * Settings → "Ajouter une grille (Ultimate Guitar)": the grid editor running on this Mac
 * creates the grid in the songs folder. Hidden when the editor is not running.
 */
export function AddGridFromUltimateGuitar(): ReactElement | null {
  const [available, setAvailable] = useState(false)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchGridEditorStatus
      .call()
      .then((r) => setAvailable(r.available))
      .catch(() => setAvailable(false))
  }, [])

  if (!available) return null

  async function submit(): Promise<void> {
    setBusy(true)
    setMessage(null)
    try {
      const userId = Number(window.localStorage.getItem('userId'))
      const result = (await importUltimateGuitar.call({ userId, url })) as ImportResult
      const title = result.name.replace(/\.txt$/, '')
      setMessage(
        result.exists
          ? `« ${title} » existe déjà : rien n’a été modifié (pour la remplacer, passe par l’éditeur de grilles).`
          : `Grille créée : « ${title} ». Elle apparaît dans la recherche.`
      )
      if (!result.exists) setUrl('')
    } catch (e) {
      setMessage(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setMessage(null)
      }}
      trigger={
        <Button variant="outline">
          <SettingEmoji emoji="➕" />
          Ajouter une grille (Ultimate Guitar)
        </Button>
      }
      title="Ajouter une grille"
      desc="Colle le lien d’une page d’accords Ultimate Guitar : l’éditeur de grilles crée la grille dans le dossier des chansons."
    >
      <form
        className="flex flex-col gap-3"
        onKeyDown={stopShortcuts}
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tabs.ultimate-guitar.com/tab/…"
        />
        {message && <p className="text-sm">{message}</p>}
        <Button type="submit" className="self-start" disabled={busy || !url.trim()}>
          {busy ? 'Import…' : 'Ajouter'}
        </Button>
      </form>
    </Modal>
  )
}
