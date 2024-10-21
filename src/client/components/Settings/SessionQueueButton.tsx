import { useModal } from '@/utils/useModal'
import { IoPlayCircleOutline } from 'react-icons/io5'
import { Modal } from '../Modal'
import { SessionQueue } from '../Queue/SessionQueue'
import { Button } from '../ui/button'

export function SessionQueueButton() {
  const modalProps = useModal()

  const isMobile = window.innerWidth < 768

  return (
    <div className="lg:invisible">
      <Modal
        {...modalProps}
        title="Prochaines chansons"
        desc="Liste des prochaines chansons"
        modalSize="sm:max-w-[calc(100vw-64px)]"
        trigger={
          <Button>
            <IoPlayCircleOutline size={isMobile ? 12 : 24} />
          </Button>
        }
      >
        <SessionQueue maxHeight="max-h-[calc(100vh-280px)]" />
      </Modal>
    </div>
  )
}
