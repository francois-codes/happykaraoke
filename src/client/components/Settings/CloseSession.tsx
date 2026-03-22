import { useToast } from '@/components/ui/use-toast'
import { useStore } from '@/store'
import { closeSession } from '@shared/endpoints/session'
import { scrollDiagnosticLog } from '@shared/lib/scrollDiagnosticLog'
import { useNavigate } from 'react-router-dom'
import packageJson from '../../../../package.json'
import { ButtonWithConfirmAction } from '../ButtonWithConfirmAction'

export function CloseSession() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { scrollMaster, isAdmin, currentSong } = useStore()

  async function endSession() {
    await closeSession.call()
    try {
      const text = scrollDiagnosticLog.serializeJson(
        {
          appVersion: packageJson.version,
          scrollMaster: !!scrollMaster,
          isAdmin: !!isAdmin,
          electron: typeof window !== 'undefined' && !!window.electron?.writeScrollDiagnosticLog,
          currentSongId: currentSong ?? null
        },
        2
      )
      if (window.electron?.writeScrollDiagnosticLog) {
        const { path } = await window.electron.writeScrollDiagnosticLog(text)
        toast({
          title: 'Journal scroll sauvegardé',
          description: path
        })
      }
    } catch {
      /* optional flush should not block leaving */
    }
    navigate('/')
  }

  return (
    <ButtonWithConfirmAction
      label="Terminer la session"
      title="Terminer la session"
      desc="Etes vous sur ? Terminer la session entrainera la suppression des utilisateurs"
      onClick={endSession}
      className="w-full"
    >
      Oui, fermer
    </ButtonWithConfirmAction>
  )
}
