import { stepsBetweenKeys, tonalitiesNames } from '@shared/lib/transpose/tonality'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { useDispatch, useStore } from '@/store'
import { setTranspo } from '@shared/endpoints/song'
import { IoMusicalNotesOutline } from 'react-icons/io5'
import { useEffect, useState } from 'react'
import { keyboardShortcut } from '@/lib/shortcut'
import { KEYS } from '@/lib/consts'

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
  const [selectedTona, setSelectedTona] = useState(tonalitiesNames[0])
  const [currentTonaIndex, setCurrentTonaIndex] = useState(0)
  const dispatch = useDispatch()

  function setOpen(open: boolean) {
    dispatch({ transpoOpen: open })
  }

  const songTona = songKey?.replace('m', '')

  function getSongTonaIndex() {
    return tonalitiesNames.findIndex((tona) => tona === songTona)
  }

  useEffect(() => {
    if (songTona) {
      setCurrentTonaIndex(getSongTonaIndex() + transpo)
    }
  }, [songTona])

  useEffect(() => {
    setSelectedTona(tonalitiesNames[currentTonaIndex])
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
        (tonalitiesNames.length + currentTonaIndex + factor * step) % tonalitiesNames.length
      )
    }

    if (o.matches(event)) {
      setCurrentTonaIndex(getSongTonaIndex())
      saveTranspo(songTona)
    }

    if (enter.matches(event)) {
      event.preventDefault()
      const tona = tonalitiesNames[currentTonaIndex]
      saveTranspo(tona)
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', navigateTona)

    return () => {
      document.removeEventListener('keydown', navigateTona)
    }
  }, [currentTonaIndex, transpoOpen])

  if (!songTona) return null

  return (
    <Dialog open={transpoOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IoMusicalNotesOutline size={24} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choisissez la nouvelle tonalité</DialogTitle>
          <DialogDescription>Selectionnez la tonalité pour la chanson en cours</DialogDescription>
        </DialogHeader>
        <div className="gap-4">
          <div className="flex flex-row flex-wrap gap-4 py-4">
            {tonalitiesNames.map((tona, index) => {
              const variant = getVariant(tona, selectedTona, songTona)

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
            tabIndex={tonalitiesNames.length}
            onClick={() => {
              setCurrentTonaIndex(getSongTonaIndex())
              saveTranspo(songTona)
            }}
          >
            Revenir à l&apos;original
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
