import { SettingEmoji } from './SettingEmoji'
import { Button } from '../ui/button'
import { useDispatch } from '@/store'

export function AddSongWithAIButton() {
  const dispatch = useDispatch()

  return (
    <Button
      onClick={() => {
        dispatch({ aiSearchOpen: true })
      }}
      variant="outline"
    >
      <SettingEmoji emoji="✨" />
      Ajouter une chanson avec IA
    </Button>
  )
}
