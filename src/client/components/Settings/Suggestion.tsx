import { useDispatch, useStore } from '@/store'
import { Button } from '../ui/button'
import { GiMicrophone } from 'react-icons/gi'

export function Suggestion() {
  const { suggestionOpen } = useStore()
  const dispatch = useDispatch()

  return (
    <>
      <Button
        onClick={() => {
          dispatch({ suggestionOpen: !suggestionOpen })
        }}
      >
        <GiMicrophone size={24} />
      </Button>
    </>
  )
}
