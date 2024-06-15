import { useEffect, useState } from 'react'
import { useDispatch, useStore } from '@/store'
import { fetchUser } from '@shared/endpoints/user'
import { UserType } from '@shared/types'
import { fetchSessionConfig } from '@shared/endpoints/session'
import { useNavigate } from 'react-router-dom'
import { sleep } from '@/utils'

export function useScreenInit({ shouldAnimateLoader = true } = {}) {
  const [userInitialized, setUserInitialized] = useState(false)
  const [sessionInitialized, setSessionInitialized] = useState(false)
  const [loaderInitialized, setLoaderInitialized] = useState(false)
  const navigate = useNavigate()

  const dispatch = useDispatch()
  const store = useStore()

  async function initUser() {
    if (typeof store.isAdmin === 'undefined' && !userInitialized) {
      try {
        const id = window.sessionStorage.getItem('userId')
        if (id) {
          const { user } = await fetchUser.call({ id })
          if (user) {
            dispatch({ isAdmin: user.type === UserType.ADMIN })
          }
        }
      } catch {
        console.log('catching user error')
        navigate('/')
      }
    }
    setUserInitialized(true)
  }

  async function initSession() {
    if (!store.currentSong && !sessionInitialized) {
      try {
        const { currentSong, songsFolder, hostUrl } = await fetchSessionConfig.call()
        dispatch({ currentSong, songsFolder, hostUrl })
      } catch {
        //
      }
    }

    setSessionInitialized(true)
  }

  async function loader() {
    if (shouldAnimateLoader) {
      await sleep(4_100)
    }

    setLoaderInitialized(true)
  }

  useEffect(() => {
    Promise.all([initUser(), initSession(), loader()])
  }, [])

  return userInitialized && sessionInitialized && loaderInitialized
}
