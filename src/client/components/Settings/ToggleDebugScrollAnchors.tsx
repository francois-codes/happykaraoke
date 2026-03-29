import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { setDebugScrollAnchorsEnabled } from '@/lib/debugSettings'
import { useDispatch, useStore } from '@/store'
import type { FC } from 'react'

export const ToggleDebugScrollAnchors: FC = () => {
  const { debugScrollAnchors } = useStore()
  const dispatch = useDispatch()

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="debug-scroll-anchors"
        checked={debugScrollAnchors}
        onCheckedChange={(v) => {
          setDebugScrollAnchorsEnabled(v)
          dispatch({ debugScrollAnchors: v })
        }}
      />
      <Label htmlFor="debug-scroll-anchors" className="text-sm font-normal leading-snug">
        Repères ancres de scroll (debug)
      </Label>
    </div>
  )
}
