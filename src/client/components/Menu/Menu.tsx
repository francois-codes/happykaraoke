import { FC } from 'react'
import image from '@/assets/live-band-logo.png'
import { useSong } from '@/lib/useSong'
import { useStore } from '@/store'
import { Transpose } from '../Settings/Transpose'
import { SettingsPanel } from '../Settings/SettingsPanel'
import { QrCode } from '../Settings/QrCode'
import { SessionQueueButton } from '../Settings/SessionQueueButton'

export const Menu: FC = () => {
  const { currentSong, isAdmin } = useStore()

  const { song } = useSong(currentSong ?? undefined)

  return (
    <header className="z-50 fixed flex items-center justify-between gap-8 w-full px-8 py-4 bg-background dark:bg-background">
      <div className="flex items-end align-start gap-8">
        <img width={36} height={36} src={image} alt="happikaraoke" />
        <h1 className="text-3xl font-bold overflow-hidden text-ellipsis whitespace-nowrap max-w-[calc(100vw-414px)]">
          {song ? (
            <>
              {song.author} - {song.title}
            </>
          ) : (
            'HappiKaraoke'
          )}
        </h1>
      </div>
      <div className="flex items-center align-center gap-8">
        {isAdmin && !!window.electron && <SessionQueueButton />}
        {isAdmin && <Transpose />}
        <QrCode />
        <SettingsPanel />
      </div>
    </header>
  )
}
