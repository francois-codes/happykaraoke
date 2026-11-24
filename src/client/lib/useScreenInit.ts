import { guestStartDisplay } from '@/lib/guestRole'
import { useDispatch } from '@/store'
import { resetScrollDebugSettings } from '@/lib/debugSettings'
import { sleep } from '@/utils'
import { fetchSessionConfig, refreshSession } from '@shared/endpoints/session'
import { releaseScrollMaster } from '@shared/endpoints/scrollControl'
import { fetchUser } from '@shared/endpoints/user'
import { isQrJoin } from '@/lib/qrJoin'
import { UserType } from '@shared/types'
import { AxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function useScreenInit({ shouldAnimateLoader = true } = {}) {
  const [userInitialized, setUserInitialized] = useState(false)
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null)
  const [sessionInitialized, setSessionInitialized] = useState(false)
  const [loaderInitialized, setLoaderInitialized] = useState(false)
  const navigate = useNavigate()

  const dispatch = useDispatch()

  const location = window.location.pathname

  async function bootstrap() {
    if (userInitialized) {
      return
    }

    resetScrollDebugSettings()
    dispatch({ debugScrollAnchors: false })

    let sessionCfg: Awaited<ReturnType<typeof fetchSessionConfig.call>> | null = null
    try {
      sessionCfg = await fetchSessionConfig.call()
      if (sessionCfg) {
        dispatch({
          currentSong: sessionCfg.currentSong,
          songsFolder: sessionCfg.songsFolder,
          hostUrl: sessionCfg.hostUrl ?? '',
          scrollControl: sessionCfg.scrollControl ?? null,
          scrollSnapshot: sessionCfg.scrollSnapshot ?? null,
          cover: sessionCfg.cover ?? null
        })
      }
    } catch {
      //
    }

    try {
      const id = window.localStorage.getItem('userId')
      if (id) {
        const numberId = Number(id)
        const { user } = await fetchUser.call({ id: numberId })

        if (user && user.type === UserType.ADMIN && isQrJoin()) {
          // Arriving from the QR code always means joining as a singer: forget the admin
          // identity this browser kept (hand scroll control back if it held it).
          if (sessionCfg?.scrollControl?.activeScrollMasterUserId === user.id) {
            try {
              await releaseScrollMaster.call({ userId: user.id })
            } catch {
              /* best-effort */
            }
          }
          window.localStorage.removeItem('userId')
        } else if (user) {
          const isAdmin = user.type === UserType.ADMIN
          if (isAdmin) {
            await refreshSession.call()
            sessionCfg = await fetchSessionConfig.call()
          }
          const sc = sessionCfg?.scrollControl ?? null

          dispatch({
            // Guests start with their role's display (Chanteur: lyrics only, by default).
            ...(isAdmin ? {} : guestStartDisplay()),
            isAdmin,
            currentSong: sessionCfg?.currentSong,
            scrollControl: sc,
            scrollSnapshot: sessionCfg?.scrollSnapshot ?? null,
            scrollMaster: isAdmin && sc?.activeScrollMasterUserId === user.id
          })

          if (location === '/' || location === '/join' || location === '/new') {
            setRedirectTarget('/session')
          }
        }
      } else {
        if (location === '/session') {
          throw new Error('no user')
        }
      }
    } catch (e) {
      const errorCode = e instanceof AxiosError ? e.response?.status : null
      if (errorCode === 404) {
        navigate(location)
      } else {
        navigate('/')
      }
    }

    setUserInitialized(true)
    setSessionInitialized(true)
  }

  async function loader() {
    if (shouldAnimateLoader) {
      await sleep(4_100)
    }

    setLoaderInitialized(true)
  }

  useEffect(() => {
    Promise.all([bootstrap(), loader()])
  }, [])

  const initialized = userInitialized && sessionInitialized && loaderInitialized

  return { initialized, redirectTarget }
}
