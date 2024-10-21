import { KEYS } from '@/lib/consts'
import { keyboardShortcut } from '@/lib/shortcut'
import { useDispatch, useStore } from '@/store'
import { setTranspo } from '@shared/endpoints/song'
import {
  getTonalityIndex,
  getTonalityPreferredName,
  stepsBetweenKeys,
  tonalities
} from '@shared/lib/transpose/tonality'
import { useEffect, useMemo, useState } from 'react'
import { IoMusicalNotesOutline } from 'react-icons/io5'
import { Modal } from '../Modal'
import { Button } from '../ui/button'

function getVariant(tona: string, selected: string, song: string) {
  if (tona === selected) return 'default'

  if (tona === song) return 'secondary'

  return 'outline'
}

const keyUp = keyboardShortcut(KEYS.up)
const keyDown = keyboardShortcut(KEYS.down)
const keyLeft = keyboardShortcut(KEYS.left)
const keyRight = keyboardShortcut(KEYS.right)
const enter = keyboardShortcut(KEYS.Enter)
const o = keyboardShortcut(KEYS.o)

export function Transpose() {
  const { songKey, transpoOpen, transpo } = useStore()
  const [selectedTona, setSelectedTona] = useState(tonalities[0])
  const [currentTonaIndex, setCurrentTonaIndex] = useState(0)
  const dispatch = useDispatch()

  const isMobile = window.innerWidth < 768

  function setOpen(open: boolean) {
    dispatch({ transpoOpen: open })
  }

  const minorMode = useMemo(() => songKey?.includes('m') || songKey?.includes('-'), [songKey])

  useEffect(() => {
    if (songKey) {
      setCurrentTonaIndex(getTonalityIndex(songKey) + transpo)
    }
  }, [songKey])

  useEffect(() => {
    setSelectedTona(tonalities[currentTonaIndex])
  }, [currentTonaIndex])

  async function saveTranspo(tona) {
    const transpo = stepsBetweenKeys(songKey, tona)
    await setTranspo.call({ transpo })
    setOpen(false)
  }

  function getOffsets(event: KeyboardEvent) {
    if (keyUp.matches(event)) {
      return [-1, 4]
    }

    if (keyDown.matches(event)) {
      return [1, 4]
    }

    if (keyLeft.matches(event)) {
      return [-1, 1]
    }

    if (keyRight.matches(event)) {
      return [1, 1]
    }

    return null
  }

  function navigateTona(event) {
    if (!transpoOpen) return

    const offset = getOffsets(event)

    if (offset) {
      const [factor, step] = offset
      setCurrentTonaIndex(
        (tonalities.length + currentTonaIndex + factor * step) % tonalities.length
      )
    }

    if (o.matches(event)) {
      songKey && setCurrentTonaIndex(getTonalityIndex(songKey))
      saveTranspo(songKey)
    }

    if (enter.matches(event)) {
      event.preventDefault()
      const tona = tonalities[currentTonaIndex]
      saveTranspo(getTonalityPreferredName(tona, minorMode))
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', navigateTona)

    return () => {
      document.removeEventListener('keydown', navigateTona)
    }
  }, [currentTonaIndex, transpoOpen])

  if (!songKey) return null

  return (
    <Modal
      trigger={
        <Button>
          <IoMusicalNotesOutline size={isMobile ? 12 : 24} />
        </Button>
      }
      title="Choisissez la nouvelle tonalité"
      desc="Selectionnez la tonalité pour la chanson en cours"
      open={transpoOpen}
      onOpenChange={setOpen}
    >
      <div className="gap-4">
        <div className="flex flex-row flex-wrap gap-4 py-4">
          {tonalities.map((tonality, index) => {
            const tona = getTonalityPreferredName(tonality, minorMode)
            const variant = getVariant(
              tona,
              getTonalityPreferredName(selectedTona, minorMode),
              songKey
            )

            return (
              <Button
                tabIndex={index + 1}
                key={tona}
                variant={variant}
                className={'w-20'}
                onClick={() => {
                  setCurrentTonaIndex(index)
                  saveTranspo(tona)
                }}
              >
                {tona}
              </Button>
            )
          })}
        </div>
        <Button
          className="w-full"
          tabIndex={tonalities.length}
          onClick={() => {
            setCurrentTonaIndex(getTonalityIndex(songKey))
            saveTranspo(songKey)
          }}
        >
          Revenir à l&apos;original
        </Button>
      </div>
    </Modal>
  )
}
