import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDispatch, useStore } from '@/store'
import { FC } from 'react'

export const ToggleScrollMaster: FC = () => {
  const { scrollMaster } = useStore()
  const dispatch = useDispatch()

  const toggleScrollMaster = () => {
    dispatch({ scrollMaster: !scrollMaster })
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch id="scroll-master" checked={scrollMaster} onClick={toggleScrollMaster} />
      <Label htmlFor="scroll-master">Scroll master</Label>
    </div>
  )
}
