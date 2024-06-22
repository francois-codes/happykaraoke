import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { setSongsFolder } from '@shared/endpoints/session'
import { useDispatch, useStore } from '@/store'

export function SongsFolderSelector({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { songsFolder } = useStore()
  const dispatch = useDispatch()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Modifier le dossier source</Button>
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
              onOpenChange(false)
            }}
          >
            Ouvrir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
