import { updateSoireeEndpoint } from '@shared/endpoints/soirees'
import {
  SOIREE_KINDS,
  type Soiree,
  type SoireeKind,
  clockTime,
  isSoireeKind,
  soireeToWhatsApp,
  timelapse
} from '@shared/lib/data/soireeFormat'
import { type KeyboardEvent, type ReactElement, useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'

export function adminId(): number {
  return Number(window.localStorage.getItem('userId'))
}

/** Typing in a soirée form must not trigger the app's keyboard shortcuts (scroll, search…). */
export function stopShortcuts(event: KeyboardEvent): void {
  if (event.key !== 'Escape') event.stopPropagation()
}

export const textareaClass =
  'w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface KindSelectProps {
  value: SoireeKind
  onChange: (kind: SoireeKind) => void
}

/** Live (official stats) / Répète / Entre amis. */
export function KindSelect({ value, onChange }: KindSelectProps): ReactElement {
  return (
    <label className="flex flex-col gap-1 text-sm">
      Type
      <select
        className={selectClass}
        value={value}
        onChange={(e) => {
          if (isSoireeKind(e.target.value)) onChange(e.target.value)
        }}
      >
        {SOIREE_KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
    </label>
  )
}

interface SoireeEditorProps {
  soiree: Soiree
  onSaved?: (soiree: Soiree) => void
}

/** Title, notes, played/not played per song, and "Copy for WhatsApp". */
export function SoireeEditor({ soiree, onSaved }: SoireeEditorProps): ReactElement {
  const [title, setTitle] = useState(soiree.title)
  const [notes, setNotes] = useState(soiree.notes)
  const [kind, setKind] = useState<SoireeKind>(soiree.kind)
  const [played, setPlayed] = useState<boolean[]>(soiree.songs.map((s) => s.played))
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setTitle(soiree.title)
    setNotes(soiree.notes)
    setKind(soiree.kind)
    setPlayed(soiree.songs.map((s) => s.played))
  }, [soiree])

  const draft: Soiree = {
    ...soiree,
    title,
    notes,
    kind,
    songs: soiree.songs.map((s, i) => ({ ...s, played: played[i] }))
  }
  const dirty =
    title !== soiree.title ||
    notes !== soiree.notes ||
    kind !== soiree.kind ||
    played.some((p, i) => p !== soiree.songs[i].played)

  async function save(): Promise<Soiree> {
    const saved = (await updateSoireeEndpoint.call({
      userId: adminId(),
      id: soiree.id,
      patch: { title, notes, kind, played }
    })) as Soiree
    onSaved?.(saved)
    return saved
  }

  async function onSave(): Promise<void> {
    try {
      await save()
      setStatus('Enregistré ✓')
    } catch {
      setStatus('Impossible d’enregistrer')
    }
  }

  async function onCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(soireeToWhatsApp(draft))
      if (dirty) await save()
      setStatus('Copié : colle-le dans WhatsApp ✓')
    } catch {
      setStatus('Copie impossible')
    }
  }

  const count = played.filter(Boolean).length

  return (
    <div className="flex flex-col gap-3" onKeyDown={stopShortcuts}>
      <label className="flex flex-col gap-1 text-sm">
        Titre
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Anniversaire de Laure" />
      </label>
      <KindSelect value={kind} onChange={setKind} />
      <label className="flex flex-col gap-1 text-sm">
        Commentaires (contexte, bilan…)
        <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <p className="text-sm text-muted-foreground">
        {count} morceaux · timelapse {timelapse(draft)} · décoche ce qui n’a pas été joué
      </p>
      <ul className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto pr-1">
        {soiree.songs.map((song, i) => (
          <li key={`${song.start}-${i}`}>
            <label className={`flex items-center gap-2 text-sm ${played[i] ? '' : 'opacity-50 line-through'}`}>
              <Checkbox
                checked={played[i]}
                onCheckedChange={(checked) => setPlayed((prev) => prev.map((p, j) => (j === i ? checked === true : p)))}
              />
              <span className="tabular-nums text-muted-foreground">{clockTime(song.start)}</span>
              <span>{song.artist ? `${song.artist} : ${song.title}` : song.title}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void onCopy()}>Copier pour WhatsApp</Button>
        <Button variant="outline" disabled={!dirty} onClick={() => void onSave()}>
          Enregistrer
        </Button>
        {status && <span className="text-sm text-muted-foreground">{status}</span>}
      </div>
    </div>
  )
}
