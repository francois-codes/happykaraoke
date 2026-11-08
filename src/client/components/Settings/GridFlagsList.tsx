import { changeSong } from '@shared/endpoints/song'
import { fetchGridFlags, setGridFlagNoteEndpoint, unflagSong } from '@shared/endpoints/gridFlags'
import type { GridFlag } from '@shared/lib/data/gridFlags'
import { formatDate } from 'date-fns'
import { type ReactElement, useState } from 'react'
import { IoCheckmarkOutline, IoPlayOutline } from 'react-icons/io5'
import { Modal } from '../Modal'
import { Button } from '../ui/button'

function adminId(): number {
  return Number(window.localStorage.getItem('userId'))
}

/** Settings → "Grilles à corriger": songs flagged with the P key, newest first. */
export function GridFlagsList(): ReactElement {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [flags, setFlags] = useState<GridFlag[]>([])

  async function load(): Promise<void> {
    setLoading(true)
    try {
      const result = await fetchGridFlags.call()
      setFlags([...result].sort((a, b) => b.markedAt.localeCompare(a.markedAt)))
    } finally {
      setLoading(false)
    }
  }

  function onOpenChange(next: boolean): void {
    setOpen(next)
    if (next) void load()
  }

  async function saveNote(flag: GridFlag, note: string): Promise<void> {
    if ((flag.note ?? '') === note.trim()) return
    await setGridFlagNoteEndpoint.call({ userId: adminId(), file: flag.file, note })
    await load()
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={<Button variant="outline">Grilles à corriger</Button>}
      title="Grilles à corriger"
      desc="Chansons marquées avec P. Elles disparaissent dès que la grille est modifiée."
    >
      <div className="gap-4 flex flex-col items-center p-4">
        {loading && flags.length === 0 ? (
          <p>Chargement...</p>
        ) : flags.length === 0 ? (
          <p className="text-sm">Aucune grille à corriger. Appuie sur P pendant une chanson pour la marquer.</p>
        ) : (
          <div className="flex flex-col gap-3 w-full max-h-[60vh] overflow-scroll" data-grid-flags-list>
            {flags.map((flag) => (
              <div key={flag.file} className="flex flex-row gap-2 items-start justify-between" data-grid-flag={flag.file}>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <p className="text-sm font-medium">{flag.title}</p>
                  <p className="text-xs">
                    {formatDate(flag.markedAt, 'yyyy-MM-dd HH:mm')} · {flag.sections.map((s) => s.name).join(', ')}
                  </p>
                  <input
                    className="text-xs rounded border border-input bg-background px-2 py-1"
                    placeholder="Note (accord faux mesure 3…)"
                    defaultValue={flag.note ?? ''}
                    onBlur={(e) => void saveNote(flag, e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                  />
                </div>
                <div className="flex flex-row items-center gap-1">
                  <Button
                    size="sm"
                    aria-label="Afficher cette chanson"
                    onClick={async () => {
                      await changeSong.call({ title: flag.title })
                      setOpen(false)
                    }}
                  >
                    <IoPlayOutline size={16} />
                  </Button>
                  <Button
                    size="sm"
                    aria-label="Retirer de la liste"
                    className="bg-stone-400 text-white hover:bg-stone-500 dark:bg-stone-600 dark:hover:bg-stone-500"
                    onClick={async () => {
                      await unflagSong.call({ userId: adminId(), file: flag.file })
                      await load()
                    }}
                  >
                    <IoCheckmarkOutline size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
