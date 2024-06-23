import { Button } from '../ui/button'
import { IoPlayCircleOutline } from 'react-icons/io5'
import { SessionQueue } from '../Queue/SessionQueue'
import { useModal } from '@/utils/useModal'
import { Modal } from '../Modal'

export function SessionQueueButton() {
  const modalProps = useModal()
  return (
    <div className="lg:invisible">
      <Modal
        {...modalProps}
        title="Prochaines chansons"
        desc="Liste des prochaines chansons"
        modalSize="sm:max-w-[calc(100vw-64px)]"
        trigger={
          <Button>
            <IoPlayCircleOutline size={24} />
          </Button>
        }
      >
        <SessionQueue maxHeight="max-h-[calc(100vh-280px)]" />
      </Modal>
    </div>
  )
}
