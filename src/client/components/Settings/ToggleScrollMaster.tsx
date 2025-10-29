import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDispatch, useStore } from '@/store'
import { enableScrollMaster } from '@shared/endpoints/scroll'
import { FC } from 'react'

export const ToggleScrollMaster: FC = () => {
  const { scrollMaster } = useStore()
  const dispatch = useDispatch()
  const userId = window.localStorage.getItem('userId')

  const toggleScrollMaster = async () => {
    const newValue = !scrollMaster
    dispatch({ scrollMaster: newValue })

    // Emit socket event when enabling scroll master to notify other admins
    if (newValue && userId) {
      await enableScrollMaster.call({ userId })
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch id="scroll-master" checked={scrollMaster} onClick={toggleScrollMaster} />
      <Label htmlFor="scroll-master">Scroll master</Label>
    </div>
  )
}
