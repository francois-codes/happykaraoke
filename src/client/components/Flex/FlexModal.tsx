import image from '@/assets/le_champion.webp'
import { useStore } from '@/store'
import { getSongsList } from '@shared/endpoints/song'
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
    </Modal>
  )
}
