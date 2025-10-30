import { Button } from '../ui/button'
import { useDispatch } from '@/store'
import { IoKeyOutline } from 'react-icons/io5'

export function OpenAIKeyButton() {
  const dispatch = useDispatch()

  return (
    <Button
      onClick={() => {
        dispatch({ openAIKeyModalOpen: true })
      }}
      variant="outline"
    >
      <IoKeyOutline className="mr-2" />
      Configurer clé Perplexity AI
    </Button>
  )
}
