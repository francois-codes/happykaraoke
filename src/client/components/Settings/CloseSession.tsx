import { closeSession } from '@shared/endpoints/session'
import { useNavigate } from 'react-router-dom'
import { ButtonWithConfirmAction } from '../ButtonWithConfirmAction'

export function CloseSession() {
  const navigate = useNavigate()

  async function endSession() {
    await closeSession.call()
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
