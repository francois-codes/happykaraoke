import { useModal } from '@/utils/useModal'
import { Modal, ModalProps } from '../Modal'
import { Button, ButtonProps } from '../ui/button'

interface Props extends Pick<ModalProps, 'title' | 'desc'>, Omit<ButtonProps, 'title'> {
  label: string
}

export function ButtonWithConfirmAction({ title, desc, label, onClick, ...buttonProps }: Props) {
  const modalProps = useModal()
  return (
    <Modal {...modalProps} trigger={<Button>{label}</Button>} title={title} desc={desc}>
      <div className="gap-4 flex flex-col items-center py-4 w-full">
        <Button
          {...buttonProps}
          onClick={async (event) => {
            await onClick?.(event)
            modalProps.onOpenChange(false)
          }}
        />
      </div>
    </Modal>
  )
}
