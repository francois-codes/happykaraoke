import {
  createLiveFromLog,
  deleteLive,
  fetchDayLog,
  fetchLiveCandidates,
  fetchSoiree,
  fetchSoirees,
  ignoreLiveCandidate
} from '@shared/endpoints/soirees'
import {
  type LiveCandidate,
  type LogLine,
  type Soiree,
  type SoireeKind,
  type SoireeSummary,
  type WebStatus,
  clockTime,
  dataKaraokeLiveUrl,
  kindLabel,
  splitSongName
} from '@shared/lib/data/soireeFormat'
import { AxiosError } from 'axios'
import { formatDate } from 'date-fns'
import { type ReactElement, useState } from 'react'
import { Modal } from '../Modal'
import { KindSelect, SoireeEditor, adminId, stopShortcuts, textareaClass } from '../Soiree/SoireeEditor'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SettingEmoji } from './SettingEmoji'

type View =
  | { name: 'list' }
  | { name: 'detail'; soiree: Soiree }
  | { name: 'qualify'; from: string; to: string; count: number }
  | { name: 'add' }

function errorMessage(e: unknown): string {
  if (e instanceof AxiosError) {
    const data: unknown = e.response?.data
    if (typeof data === 'object' && data !== null && 'message' in data) return String(data.message)
  }
  return e instanceof Error ? e.message : String(e)
}

const when = (iso: string): string => formatDate(iso, 'dd/MM/yyyy')
const songLabel = (song: string): string => {
  const { artist, title } = splitSongName(song)
  return artist ? `${artist} : ${title}` : title
}

/** Where the live stands on the Data Karaoké site, shown under it in the list (online: a green check after the title). */
const WEB_LABELS: Record<Exclude<WebStatus, 'online'>, string> = {
  outdated: '⏳ Modifié : mise à jour à la prochaine synchro',
  pending: '⏳ Publié à la prochaine synchro',
  private: 'Non publié'
}

/** Opens the live's page on Data Karaoké (in the browser from the Electron app), once it has been published. */
function DataKaraokeLink({ id, web }: { id: string; web: WebStatus | undefined }): ReactElement | null {
  if (web !== 'online' && web !== 'outdated') return null
  return (
    <Button asChild variant="outline" className="self-start">
      <a href={dataKaraokeLiveUrl(id)} target="_blank" rel="noreferrer">
        Voir sur Data Karaoké ↗
      </a>
    </Button>
  )
}

interface QualifyFormProps {
  from: string
  to: string
  count: number
  onDone: () => void
}

/** Title / type / notes for a live found afterwards, then saves it. */
function QualifyForm({ from, to, count, onDone }: QualifyFormProps): ReactElement {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<SoireeKind>('live')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function save(): Promise<void> {
    try {
      await createLiveFromLog.call({ userId: adminId(), from, to, title, notes, kind })
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onKeyDown={stopShortcuts}
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <p className="text-sm text-muted-foreground">
        {when(from)} · {clockTime(from)} → {clockTime(to)} · {count} morceaux
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Titre
        <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Anniversaire de Laure" />
      </label>
      <KindSelect value={kind} onChange={setKind} />
      <label className="flex flex-col gap-1 text-sm">
        Commentaires (facultatif)
        <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="self-start">
        Enregistrer
      </Button>
    </form>
  )
}

interface AddLiveProps {
  onPicked: (from: string, to: string, count: number) => void
}

/** "Ajouter un live": pick a day, then click the first and the last song of the live. */
function AddLive({ onPicked }: AddLiveProps): ReactElement {
  const [day, setDay] = useState('')
  const [lines, setLines] = useState<LogLine[] | null>(null)
  const [first, setFirst] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load(value: string): Promise<void> {
    setDay(value)
    setFirst(null)
    setError(null)
    if (!value) return setLines(null)
    try {
      setLines((await fetchDayLog.call({ day: value })) as LogLine[])
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  function pick(i: number): void {
    if (!lines) return
    if (first === null) return setFirst(i)
    const [a, b] = [first, i].sort((x, y) => x - y)
    onPicked(lines[a].timestamp, lines[b].timestamp, b - a + 1)
  }

  return (
    <div className="flex flex-col gap-3" onKeyDown={stopShortcuts}>
      <label className="flex flex-col gap-1 text-sm">
        Jour du live (les morceaux après minuit comptent pour la veille)
        <Input type="date" value={day} onChange={(e) => void load(e.target.value)} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {lines && lines.length === 0 && <p className="text-sm">Aucun morceau ce jour-là dans l’appli.</p>}
      {lines && lines.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {first === null ? 'Clique sur le premier morceau du live.' : 'Clique maintenant sur le dernier morceau.'}
          </p>
          <ul className="flex flex-col max-h-[45vh] overflow-y-auto">
            {lines.map((line, i) => (
              <li key={`${line.timestamp}-${i}`}>
                <button
                  type="button"
                  className={`w-full text-left rounded-md px-2 py-1 text-sm hover:bg-accent ${i === first ? 'bg-accent font-medium' : ''}`}
                  onClick={() => pick(i)}
                >
                  <span className="tabular-nums text-muted-foreground mr-2">{clockTime(line.timestamp)}</span>
                  {songLabel(line.song)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** Settings → "Lives": groups to qualify, manual add, and saved lives (newest first). */
export function LivesList(): ReactElement {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lives, setLives] = useState<SoireeSummary[]>([])
  const [candidates, setCandidates] = useState<LiveCandidate[]>([])
  const [view, setView] = useState<View>({ name: 'list' })

  async function load(): Promise<void> {
    setLoading(true)
    try {
      const [saved, found] = await Promise.all([fetchSoirees.call(), fetchLiveCandidates.call()])
      setLives(saved)
      setCandidates(found)
    } finally {
      setLoading(false)
    }
  }

  function back(): void {
    setView({ name: 'list' })
    void load()
  }

  function onOpenChange(next: boolean): void {
    setOpen(next)
    setView({ name: 'list' })
    if (next) void load()
  }

  async function select(id: string): Promise<void> {
    setView({ name: 'detail', soiree: (await fetchSoiree.call({ id })) as Soiree })
  }

  async function ignore(from: string): Promise<void> {
    await ignoreLiveCandidate.call({ userId: adminId(), from })
    void load()
  }

  async function remove(soiree: Soiree): Promise<void> {
    if (!window.confirm(`Supprimer « ${soiree.title} » ? Ses morceaux pourront être reproposés à qualifier.`)) return
    await deleteLive.call({ userId: adminId(), id: soiree.id })
    back()
  }

  const titles: Record<View['name'], string> = {
    list: 'Lives',
    detail: view.name === 'detail' ? view.soiree.title : '',
    qualify: 'Qualifier ce live',
    add: 'Ajouter un live'
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <Button variant="outline">
          <SettingEmoji emoji="🎤" />
          Lives
        </Button>
      }
      title={titles[view.name]}
      desc={
        view.name === 'detail'
          ? `${formatDate(view.soiree.startedAt, 'dd/MM/yyyy HH:mm')} · ${kindLabel(view.soiree.kind)}`
          : view.name === 'list'
            ? 'Seuls les lives de type « Live » sont publiés sur Data Karaoké, à la synchro quotidienne.'
            : undefined
      }
      modalSize="sm:max-w-[640px]"
    >
      {view.name !== 'list' && (
        <Button variant="outline" className="self-start" onClick={back}>
          ← Tous les lives
        </Button>
      )}

      {view.name === 'detail' && (
        <div className="flex flex-col gap-3">
          <SoireeEditor soiree={view.soiree} onSaved={(s) => setView({ name: 'detail', soiree: s })} />
          <DataKaraokeLink id={view.soiree.id} web={lives.find((l) => l.id === view.soiree.id)?.web} />
          <Button variant="outline" className="self-start text-red-600" onClick={() => void remove(view.soiree)}>
            Supprimer ce live
          </Button>
        </div>
      )}

      {view.name === 'qualify' && <QualifyForm from={view.from} to={view.to} count={view.count} onDone={back} />}

      {view.name === 'add' && <AddLive onPicked={(from, to, count) => setView({ name: 'qualify', from, to, count })} />}

      {view.name === 'list' &&
        (loading ? (
          <p>Chargement…</p>
        ) : (
          <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
            {candidates.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">À qualifier</h3>
                <p className="text-xs text-muted-foreground">
                  Repérés dans l’historique : au moins 10 morceaux sur 1 h, sans pause de plus de 45 min.
                </p>
                {candidates.map((c) => (
                  <div key={c.from} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1">
                    <span className="text-sm">
                      {when(c.from)} · {clockTime(c.from)} → {clockTime(c.to)} · {c.count} morceaux
                    </span>
                    <span className="flex gap-1">
                      <Button size="sm" onClick={() => setView({ name: 'qualify', from: c.from, to: c.to, count: c.count })}>
                        Qualifier
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void ignore(c.from)}>
                        Ignorer
                      </Button>
                    </span>
                  </div>
                ))}
              </section>
            )}

            <Button variant="outline" className="self-start" onClick={() => setView({ name: 'add' })}>
              + Ajouter un live
            </Button>

            {lives.length === 0 ? (
              <p className="text-sm">Aucun live enregistré pour l’instant : lance ▶ en début de live.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {lives.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full text-left rounded-md px-2 py-1 hover:bg-accent"
                      onClick={() => void select(s.id)}
                    >
                      <span className="text-sm font-medium">
                        {s.title}
                        {s.web === 'online' && (
                          <span
                            className="ml-1 text-emerald-600 dark:text-emerald-400"
                            title="En ligne sur Data Karaoké"
                            aria-label="En ligne sur Data Karaoké"
                          >
                            ✓
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(s.startedAt, 'dd/MM/yyyy HH:mm')} · {s.playedCount} morceaux
                        {s.kind !== 'live' && ` · ${kindLabel(s.kind)}`}
                      </span>
                      {s.web !== 'online' && (
                        <span className="block text-xs text-muted-foreground">{WEB_LABELS[s.web]}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </Modal>
  )
}
