import { Button, ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { PropsWithChildren } from 'react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  desc?: string
  footerButtons?: {
    label: string
    onClick: () => void
    type?: ButtonProps['type']
  }[]
}

export function Modal({
  open,
  onOpenChange,
  title,
  desc,
  children,
  footerButtons
}: PropsWithChildren<ModalProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {desc && <DialogDescription>{desc}</DialogDescription>}
        </DialogHeader>
        {children}
        {footerButtons?.length &&
          footerButtons.map((button) => (
            <DialogFooter key={button.label}>
              <Button type={button.type ?? 'button'} onClick={button.onClick}>
                {button.label}
              </Button>
            </DialogFooter>
          ))}
      </DialogContent>
    </Dialog>
  )
}
