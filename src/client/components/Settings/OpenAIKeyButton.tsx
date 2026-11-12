import { SettingEmoji } from './SettingEmoji'
import { Button } from '../ui/button'
import { useDispatch } from '@/store'

export function OpenAIKeyButton() {
  const dispatch = useDispatch()

  return (
    <Button
      onClick={() => {
        dispatch({ openAIKeyModalOpen: true })
      }}
      variant="outline"
    >
      <SettingEmoji emoji="🔑" />
      Configurer clé Perplexity AI
    </Button>
  )
}
