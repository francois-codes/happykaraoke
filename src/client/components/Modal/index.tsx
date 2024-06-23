import { Button, ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { DialogTrigger } from '@radix-ui/react-dialog'
import { PropsWithChildren, ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  desc?: string
  trigger?: ReactNode
  modalSize?: string
  footerButtons?: {
    label: string
    onClick: () => void
    disabled?: boolean
    className?: string
    type?: ButtonProps['type']
  }[]
}

export function Modal({
  open,
  onOpenChange,
  title,
  desc,
  children,
  footerButtons,
  trigger,
  modalSize = 'sm:max-w-[425px]'
}: PropsWithChildren<ModalProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={modalSize}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {desc && <DialogDescription>{desc}</DialogDescription>}
        </DialogHeader>
        {children}
        {footerButtons?.length &&
          footerButtons.map(({ label, disabled, type, onClick, className }) => (
            <DialogFooter key={label}>
              <Button
                disabled={disabled}
                type={type ?? 'button'}
                onClick={onClick}
                className={className ?? ''}
              >
                {label}
              </Button>
            </DialogFooter>
          ))}
      </DialogContent>
    </Dialog>
  )
}
