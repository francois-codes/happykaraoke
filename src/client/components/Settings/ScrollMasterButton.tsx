import { Button } from '@/components/ui/button'
import { useDispatch, useStore } from '@/store'
import type { ScrollControlSnapshot } from '@shared/lib/session'
import { releaseScrollMaster, takeScrollMaster } from '@shared/endpoints/scrollControl'
import { type ReactElement, useCallback } from 'react'

/**
 * 👑 in the header (admins): take or release the scroll master. Taking it moves the hand
 * from whoever had it: the last admin to press has it.
 */
export function ScrollMasterButton(): ReactElement {
  const { scrollMaster } = useStore()
  const dispatch = useDispatch()

  const rawId = window.localStorage.getItem('userId')
  const myId = rawId ? Number(rawId) : NaN

  const applySnapshot = useCallback(
    (snap: ScrollControlSnapshot) => {
      dispatch({
        scrollControl: snap,
        scrollMaster: snap.activeScrollMasterUserId === myId
      })
    },
    [dispatch, myId]
  )

  const toggleScrollMaster = useCallback(async () => {
    const nextOn = !scrollMaster
    dispatch({ scrollMaster: nextOn })
    try {
      const call = nextOn ? takeScrollMaster : releaseScrollMaster
      applySnapshot((await call.call({ userId: myId })) as ScrollControlSnapshot)
    } catch {
      dispatch({ scrollMaster: !nextOn })
    }
  }, [applySnapshot, dispatch, myId, scrollMaster])

  return (
    <Button
      id="scroll-master"
      role="switch"
      aria-checked={!!scrollMaster}
      aria-label="Scroll master"
      title={scrollMaster ? 'Scroll master : tu as la main' : 'Prendre la main sur le défilement'}
      variant={scrollMaster ? 'outline' : 'default'}
      className={scrollMaster ? 'border-2 border-foreground' : ''}
      onClick={() => void toggleScrollMaster()}
    >
      <span aria-hidden className="text-xl leading-none grayscale">
        👑
      </span>
    </Button>
  )
}
