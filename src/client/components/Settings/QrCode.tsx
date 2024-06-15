import { useStore } from '@/store'
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

export function QrCode() {
  const { hostUrl } = useStore()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <IoQrCodeOutline />
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
          <QRCode value={hostUrl} style={{ margin: '0 auto' }} />
          <Link target="_blank" to={hostUrl}>
            {hostUrl}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
