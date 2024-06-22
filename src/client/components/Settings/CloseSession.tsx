import { Button } from '../ui/button'
import { closeSession } from '@shared/endpoints/session'
import { useNavigate } from 'react-router-dom'
import { useModal } from '@/utils/useModal'
import { Modal } from '../Modal'

export function CloseSession() {
  const navigate = useNavigate()
  const modalProps = useModal()

  async function endSession() {
    await closeSession.call()
    navigate('/')
  }

  return (
    <Modal
      {...modalProps}
      trigger={<Button>Terminer la session</Button>}
      title="Terminer la session"
      desc="Etes vous sur ? Terminer la session entrainera la suppression des utilisateurs"
    >
      <div className="gap-4 flex flex-col items-center py-4 w-full">
        <Button onClick={endSession} className="w-full">
          Oui, fermer
        </Button>
      </div>
    </Modal>
  )
}
