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

  useEffect(() => {
    if (songTona) {
      setCurrentTonaIndex(tonalitiesNames.findIndex((tona) => tona === songTona) + transpo)
    }
  }, [songTona])

  useEffect(() => {
    setSelectedTona(tonalitiesNames[currentTonaIndex])
  }, [currentTonaIndex])

  async function saveTranspo(tona) {
    console.log('setting ', tona)
    const transpo = stepsBetweenKeys(songKey, tona)
    await setTranspo.call({ transpo })
    setOpen(false)
  }

  function navigateTona(event) {
    if (keyUp.matches(event)) {
      if (currentTonaIndex < 4) return
      setCurrentTonaIndex(currentTonaIndex - 4)
    }

    if (keyDown.matches(event)) {
      if (currentTonaIndex > 7) return
      setCurrentTonaIndex(currentTonaIndex + 4)
    }

    if (keyRight.matches(event)) {
      if (currentTonaIndex > 10) return
      setCurrentTonaIndex(currentTonaIndex + 1)
    }

    if (keyLeft.matches(event)) {
      if (currentTonaIndex < 1) return
      setCurrentTonaIndex(currentTonaIndex - 1)
    }

    if (o.matches(event)) {
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
  }, [currentTonaIndex])

  if (!songTona) return null

  return (
    <Dialog open={transpoOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IoMusicalNotesOutline />
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
