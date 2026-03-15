import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { setSongsFolder } from '@shared/endpoints/session'
import { useDispatch, useStore } from '@/store'
import { Modal } from '../Modal'
import { isTauri } from '@/lib/tauriEnv'

async function openFolderDialog(): Promise<string | null> {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({ directory: true, multiple: false })
    return typeof selected === 'string' ? selected : null
  }
  return window.electron?.openDialog() ?? null
}

export function SongsFolderSelector() {
  const { songsFolder, songsFolderOpen } = useStore()
  const dispatch = useDispatch()

  function onOpenChange(open) {
    dispatch({ songsFolderOpen: open })
  }

  return (
    <Modal
      title="Choisissez le dossier source"
      desc="Selectionnez le dossier contenant les chansons"
      open={songsFolderOpen}
      onOpenChange={onOpenChange}
      footerButtons={[
        {
          label: 'Ouvrir',
          async onClick() {
            const folder = await openFolderDialog()
            if (!folder) return
            await setSongsFolder.call({ folder })
            dispatch({ currentSong: null, songsFolder: folder })
            onOpenChange(false)
          },
          className: 'w-full'
        }
      ]}
    >
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="picture">Dossier:</Label>
        <Input disabled type="text" value={songsFolder} placeholder={songsFolder} />
      </div>
    </Modal>
  )
}
