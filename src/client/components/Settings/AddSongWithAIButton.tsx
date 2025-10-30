import { Button } from '../ui/button'
import { useDispatch } from '@/store'
import { IoColorWandOutline } from 'react-icons/io5'

export function AddSongWithAIButton() {
  const dispatch = useDispatch()

  return (
    <Button
      onClick={() => {
        dispatch({ aiSearchOpen: true })
      }}
      variant="outline"
    >
      <IoColorWandOutline className="mr-2" />
      Ajouter une chanson avec IA
    </Button>
  )
}
