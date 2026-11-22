import { socket } from '@/utils/socket'
import {
  cancelSoireeEndpoint,
  fetchCurrentSoiree,
  startSoireeEndpoint,
  stopSoireeEndpoint
} from '@shared/endpoints/soirees'
import type { Soiree, SoireeKind } from '@shared/lib/data/soireeFormat'
import { soireeChanged } from '@shared/messages/soiree'
import { AxiosError } from 'axios'
import { type ReactElement, useEffect, useState } from 'react'
import { IoPlay, IoStop } from 'react-icons/io5'
import { Modal } from '../Modal'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { KindSelect, SoireeEditor, adminId, stopShortcuts, textareaClass } from './SoireeEditor'

function elapsed(startedAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000))
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

function errorMessage(e: unknown): string {
  if (e instanceof AxiosError) {
    const data: unknown = e.response?.data
    if (typeof data === 'object' && data !== null && 'message' in data) return String(data.message)
  }
  return e instanceof Error ? e.message : String(e)
}

/**
 * ▶ / ■ in the header (admins): ▶ starts the live (songs launched before — sound check,
 * tests — are left out); ■ asks for a title and notes, saves it, then shows the setlist.
 */
export function SoireeButton(): ReactElement {
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [stopOpen, setStopOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [kind, setKind] = useState<SoireeKind>('live')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Soiree | null>(null)

  useEffect(() => {
    fetchCurrentSoiree.call().then((r) => setStartedAt(r.startedAt)).catch(() => undefined)
  }, [])

  soireeChanged.client.useMessage(socket, ({ startedAt: next }) => setStartedAt(next), [])

  useEffect(() => {
    if (!startedAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    setNow(Date.now())
    return () => window.clearInterval(timer)
  }, [startedAt])

  async function start(): Promise<void> {
    try {
      const result = (await startSoireeEndpoint.call({ userId: adminId() })) as { startedAt: string }
      setStartedAt(result.startedAt)
    } catch (e) {
      window.alert(`Impossible de démarrer le live : ${errorMessage(e)}`)
    }
  }

  async function stop(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const result = (await stopSoireeEndpoint.call({ userId: adminId(), title, notes, kind })) as { soiree: Soiree | null }
      setStartedAt(null)
      setStopOpen(false)
      setTitle('')
      setNotes('')
      setKind('live')
      if (result.soiree) setSaved(result.soiree)
      else window.alert('Aucun morceau joué depuis ▶ : rien n’a été enregistré.')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function cancel(): Promise<void> {
    if (!window.confirm('Arrêter le live sans l’enregistrer ?')) return
    await cancelSoireeEndpoint.call({ userId: adminId() })
    setStartedAt(null)
    setStopOpen(false)
  }

  return (
    <>
      {startedAt ? (
        <Button
          className="bg-red-600 text-white hover:bg-red-700 gap-2"
          title="Terminer le live"
          aria-label="Terminer le live"
          onClick={() => setStopOpen(true)}
        >
          <IoStop size={20} />
          <span className="hidden lg:inline tabular-nums whitespace-nowrap">{elapsed(startedAt, now)}</span>
        </Button>
      ) : (
        <Button
          title="Démarrer le live (ce qui a été joué avant ne compte pas)"
          aria-label="Démarrer le live"
          onClick={() => void start()}
        >
          <IoPlay size={22} />
        </Button>
      )}

      <Modal open={stopOpen} onOpenChange={setStopOpen} title="Fin du live" desc="Les morceaux joués depuis ▶ seront enregistrés.">
        <form
          className="flex flex-col gap-3"
          onKeyDown={stopShortcuts}
          onSubmit={(e) => {
            e.preventDefault()
            void stop()
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            Titre du live (soirée, concert…)
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Anniversaire de Laure" />
          </label>
          <KindSelect value={kind} onChange={setKind} />
          <label className="flex flex-col gap-1 text-sm">
            Commentaires (facultatif)
            <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2 justify-between">
            <Button type="button" variant="outline" onClick={() => void cancel()}>
              Arrêter sans enregistrer
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStopOpen(false)}>
                Continuer
              </Button>
              <Button type="submit" disabled={busy}>
                Terminer et enregistrer
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={saved !== null}
        onOpenChange={(open) => !open && setSaved(null)}
        title={saved ? `Live enregistré : ${saved.title}` : ''}
        desc="Décoche ce qui n’a pas été joué, puis copie la setlist pour WhatsApp."
        modalSize="sm:max-w-[640px]"
      >
        {saved && <SoireeEditor soiree={saved} onSaved={setSaved} />}
      </Modal>
    </>
  )
}
