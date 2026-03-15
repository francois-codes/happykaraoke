import { KEYS } from '@/lib/consts'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useDispatch, useStore } from '@/store'
import { IoQrCodeOutline } from 'react-icons/io5'
import QRCode from 'react-qr-code'
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

  const baseUrl = hostUrl || 'http://127.0.0.1:8081'
  const linkUrl = `${baseUrl}/join`
  const isLocalhost = baseUrl.includes('127.0.0.1')

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
        <a href={linkUrl} target="_blank" rel="noreferrer" className="text-primary underline break-all text-center">
          {linkUrl}
        </a>
        {isLocalhost && (
          <p className="text-muted-foreground text-sm text-center">
            Cette adresse fonctionne sur cet appareil. Pour rejoindre depuis un téléphone ou une tablette, connectez-vous au même Wi‑Fi et utilisez l’adresse IP de cette machine (Réglages → Réseau).
          </p>
        )}
      </div>
    </Modal>
  )
}
