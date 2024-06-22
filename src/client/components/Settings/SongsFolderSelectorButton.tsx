import { Button } from '../ui/button'
import { useDispatch, useStore } from '@/store'

export function SongsFolderSelectorButton() {
  const { songsFolderOpen } = useStore()
  const dispatch = useDispatch()

  return (
    <Button
      onClick={() => {
        dispatch({ songsFolderOpen: !songsFolderOpen })
      }}
      variant="outline"
    >
      Modifier le dossier source
    </Button>
  )
}
