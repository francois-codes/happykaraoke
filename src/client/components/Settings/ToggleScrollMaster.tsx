import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDispatch, useStore } from '@/store'
import type { ScrollControlSnapshot } from '@shared/lib/session'
import { releaseScrollMaster, takeScrollMaster } from '@shared/endpoints/scrollControl'
import { FC, useCallback } from 'react'

export const ToggleScrollMaster: FC = () => {
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
      if (nextOn) {
        const snap = (await takeScrollMaster.call({ userId: myId })) as ScrollControlSnapshot
        applySnapshot(snap)
      } else {
        const snap = (await releaseScrollMaster.call({ userId: myId })) as ScrollControlSnapshot
        applySnapshot(snap)
      }
    } catch {
      dispatch({ scrollMaster: !nextOn })
    }
  }, [applySnapshot, dispatch, myId, scrollMaster])

  return (
    <div className="flex items-center space-x-2">
      <Switch id="scroll-master" checked={scrollMaster} onClick={() => toggleScrollMaster()} />
      <Label htmlFor="scroll-master">Scroll master</Label>
    </div>
  )
}
