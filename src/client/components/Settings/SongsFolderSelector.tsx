import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { setSongsFolder } from '@shared/endpoints/session'
import { useDispatch, useStore } from '@/store'
import { Modal } from '../Modal'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'

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
            const folder = await window.electron?.openDialog()
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
