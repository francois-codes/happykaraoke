import { Button } from '@/components/ui/button'
import { useDispatch, useStore } from '@/store'
import { releaseScrollMaster } from '@shared/endpoints/scrollControl'
import { useCallback, useState } from 'react'
import { IoLogOutOutline } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'

export function Logout() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { scrollMaster, isAdmin } = useStore()
  const [busy, setBusy] = useState(false)

  const onLogout = useCallback(async () => {
    setBusy(true)
    try {
      const raw = window.localStorage.getItem('userId')
      const myId = raw ? Number(raw) : NaN
      if (isAdmin && scrollMaster && Number.isFinite(myId)) {
        try {
          await releaseScrollMaster.call({ userId: myId })
        } catch {
          /* best-effort: still clear this client */
        }
      }
      window.localStorage.removeItem('userId')
      dispatch({
        settingsOpen: false,
        isAdmin: false,
        scrollMaster: false,
        currentSong: null,
        scrollControl: null,
        scrollSnapshot: null,
        songsFolder: undefined,
        hostUrl: '',
        songKey: undefined,
        transpo: 0
      })
      navigate('/')
    } finally {
      setBusy(false)
    }
  }, [dispatch, isAdmin, navigate, scrollMaster])

  return (
    <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
      {isAdmin && (
        <p className="text-xs text-muted-foreground">
          Quitte cet appareil sans fermer la session. Les autres participants restent connectés.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2"
        disabled={busy}
        onClick={onLogout}
      >
        <IoLogOutOutline size={18} />
        {busy ? 'Déconnexion…' : 'Se déconnecter'}
      </Button>
    </div>
  )
}
