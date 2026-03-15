import { KEYS } from '@/lib/consts'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useDispatch, useStore } from '@/store'
import { IoQrCodeOutline } from 'react-icons/io5'
import QRCode from 'react-qr-code'
import { Link } from 'react-router-dom'
import { Modal } from '../Modal'
import { Button } from '../ui/button'

export function QrCode() {
  const { hostUrl, qrCodeOpen, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen } =
    useStore()
  const dispatch = useDispatch()

  function setOpen(open: boolean) {
    dispatch({ qrCodeOpen: open })
  }

  useKeyboardShortcut(
    {
      key: [KEYS.q],
      preventDefault: true,
      disable: () => searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        setOpen(!qrCodeOpen)
      }
    },
    [searchOpen, qrCodeOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  const linkUrl = `${hostUrl}/join`

  return (
    <Modal
      open={qrCodeOpen}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <IoQrCodeOutline size={24} />
        </Button>
      }
      title="Rejoindre la session"
      desc="Flashez le code ci-dessous pour rejoindre la session sur un autre appareil"
    >
      <div className="gap-4 flex flex-col items-center p-4">
        <QRCode value={linkUrl} style={{ margin: '0 auto' }} />
        <Link target="_blank" to={linkUrl}>
          {linkUrl}
        </Link>
      </div>
    </Modal>
  )
}
