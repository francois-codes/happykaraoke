import { useDispatch, useStore } from '@/store'
import { GiMicrophone } from 'react-icons/gi'
import { Button } from '../ui/button'

export function Suggestion() {
  const { suggestionOpen } = useStore()
  const dispatch = useDispatch()

  const isMobile = window.innerWidth < 768
  return (
    <>
      <Button
        onClick={() => {
          dispatch({ suggestionOpen: !suggestionOpen })
        }}
      >
        <GiMicrophone size={isMobile ? 16 : 24} />
      </Button>
    </>
  )
}
