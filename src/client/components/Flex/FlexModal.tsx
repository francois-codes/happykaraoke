import image from '@/assets/le_champion.webp'
import { useStore } from '@/store'
import { getCSVData, getSongsList } from '@shared/endpoints/song'
import { formatISO } from 'date-fns'
import { useEffect, useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../ui/button'

type Songs = Awaited<ReturnType<typeof getSongsList.call>>['songs']

export function FlexModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [_, setLoading] = useState(false)
  const [allSongs, setAllSongs] = useState<Songs>([])
  const { songsFolder } = useStore()

  async function fetchSongs() {
    setLoading(true)
    const { songs } = await getSongsList.call()
    if (!songs) return

    setAllSongs(songs)
    setLoading(false)
  }

  useEffect(() => {
    fetchSongs()
  }, [songsFolder])

  async function handleCSVDownload() {
    const { csv } = await getCSVData.call()
    const blob = new Blob([csv], { type: 'application/text' })

    // Create URL
    const url = window.URL.createObjectURL(blob)

    // Create temporary link element
    const link = document.createElement('a')
    link.href = url
    link.download = `HappyKaraoke-songs-${formatISO(new Date())}.csv`

    // Append to document, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up URL
    window.URL.revokeObjectURL(url)
  }

  return (
    <Modal
      title={`${allSongs.length} chansons dispo !`}
      trigger={<Button variant="outline">Stats</Button>}
      desc="\o/"
      open={isOpen}
      modalSize="w-[60vw]"
      onOpenChange={setIsOpen}
    >
      <div className="gap-4">Et ça, c'est bien</div>
      <div></div>

      <img src={image} alt="#flex" />
      <Button onClick={handleCSVDownload}>Exporter en CSV</Button>
    </Modal>
  )
}
