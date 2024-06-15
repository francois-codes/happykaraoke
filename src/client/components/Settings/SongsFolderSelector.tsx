import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { useDispatch, useStore } from '@/store'
import { IoFolderOpenOutline } from 'react-icons/io5'
import { Label } from '../ui/label'

import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'

import { Input } from '../ui/input'
import { setSongsFolder } from '@shared/endpoints/session'

export function SongsFolderSelector() {
  const { songsFolderOpen, songsFolder } = useStore()

  const dispatch = useDispatch()

  function setOpen(open: boolean) {
    dispatch({ songsFolderOpen: open })
  }

  useKeyboardShortcut(
    {
      key: [KEYS.o],
      modifier: [KEYS.Meta],
      handler: () => {
        setOpen(!songsFolderOpen)
      }
    },
    [songsFolderOpen]
  )

  return (
    <Dialog open={songsFolderOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IoFolderOpenOutline />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choisissez le dossier source</DialogTitle>
          <DialogDescription>Selectionnez le dossier contenant les chansons</DialogDescription>
        </DialogHeader>
        <div className="gap-4">
          <div className="flex flex-row flex-wrap gap-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="picture">Dossier:</Label>
              <Input disabled type="text" value={songsFolder} placeholder={songsFolder} />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              const folder = await window.electron?.openDialog()
              if (!folder) return
              await setSongsFolder.call({ folder })
              dispatch({ currentSong: null, songsFolder: folder })
              setOpen(false)
            }}
          >
            Ouvrir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
