import { useScreenInit } from '@/lib/useScreenInit'
import { FC, PropsWithChildren, useEffect, useState } from 'react'
import { Loader } from '../ui/loader'
import { useDarkTheme } from '@/lib/useDarkTheme'

export const Screen: FC<
  PropsWithChildren<{ shouldAnimateLoader?: boolean; showTitle?: boolean }>
> = ({ children, shouldAnimateLoader = false, showTitle }) => {
  useDarkTheme()
  const [open, setOpen] = useState(false)
  const [showLoader, setShowLoader] = useState(true)
  const initialized = useScreenInit({ shouldAnimateLoader })

  useEffect(() => {
    setTimeout(() => {
      setOpen(true)
    }, 500)
  }, [])

  useEffect(() => {
    if (initialized && open) {
      setOpen(false)
      setTimeout(() => {
        setShowLoader(false)
      }, 600)
    }
  }, [initialized, open])

  if (!initialized || showLoader) return <Loader open={open} showTitle={showTitle} />

  return children
}
