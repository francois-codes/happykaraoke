import { useDispatch, useStore } from '@/store'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { IoQrCodeOutline } from 'react-icons/io5'
import QRCode from 'react-qr-code'
import { Link } from 'react-router-dom'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'

export function QrCode() {
  const { hostUrl, qrCodeOpen, searchOpen } = useStore()
  const dispatch = useDispatch()

  function setOpen(open: boolean) {
    dispatch({ qrCodeOpen: open })
  }

  useKeyboardShortcut(
    {
      key: [KEYS.g],
      preventDefault: true,
      disable: () => searchOpen,
      handler: () => {
        setOpen(!qrCodeOpen)
      }
    },
    [searchOpen, qrCodeOpen]
  )

  const linkUrl = `${hostUrl}?join`

  return (
    <Dialog open={qrCodeOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IoQrCodeOutline size={24} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Partager la session</DialogTitle>
          <DialogDescription>
            Flashez le code ci-dessous pour rejoindre la session sur un autre appareil
          </DialogDescription>
        </DialogHeader>
        <div className="gap-4 flex flex-col items-center p-4">
          <QRCode value={linkUrl} style={{ margin: '0 auto' }} />
          <Link target="_blank" to={linkUrl}>
            {hostUrl}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
