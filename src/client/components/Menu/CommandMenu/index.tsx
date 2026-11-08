import { useEffect, useMemo, useState } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from '../../ui/command'

import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { KEYS } from '@/lib/consts'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useDispatch, useStore } from '@/store'
import { socket } from '@/utils/socket'
import { fetchGridFlags } from '@shared/endpoints/gridFlags'
import { addToQueue, getQueue } from '@shared/endpoints/queue'
import { changeSong, getSongsList } from '@shared/endpoints/song'
import { searchSong } from '@shared/lib/data/songs'
import { queueChanged } from '@shared/messages/queue'
import { songFileChanged } from '@shared/messages/song'
import { CommandLoading } from 'cmdk'

type Songs = Awaited<ReturnType<typeof getSongsList.call>>['songs']

export function CommandMenu() {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [allSongs, setAllSongs] = useState<Songs>([])
  const [availableSuggestions, setAvailableSuggestions] = useState(3)
  const [selectedSong, setSelectedSong] = useState<Nullable<Song>>(null)
  /** Titles flagged with P (admin only), shown with a ⚠ marker. */
  const [flaggedTitles, setFlaggedTitles] = useState<Set<string>>(new Set())

  const { currentSong, songsFolder, suggestionOpen, isAdmin, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen } = useStore()
  const dispatch = useDispatch()

  const userId = isAdmin ? undefined : window.localStorage.getItem('userId') ?? undefined

  async function fetchAvailableSuggestions() {
    if (!userId) return

    const { queue } = await getQueue.call()

    const suggestionsByUsers = queue.filter((item) => item.userId === Number(userId)).length

    setAvailableSuggestions(Math.max(0, 3 - suggestionsByUsers))
  }

  useEffect(() => {
    setOpen(suggestionOpen)
  }, [suggestionOpen])

  useEffect(() => {
    fetchAvailableSuggestions()
    if (!currentSong && songsFolder) {
      dispatch({ searchOpen: true })
      setOpen(true)
    }
  }, [currentSong, songsFolder])

  useEffect(() => {
    if (!open || !isAdmin) return
    fetchGridFlags
      .call()
      .then((flags) => setFlaggedTitles(new Set(flags.map((flag) => flag.title.normalize('NFC').toLowerCase()))))
      .catch(() => setFlaggedTitles(new Set()))
  }, [open, isAdmin])

  useEffect(() => {
    dispatch({ searchOpen: open })
    if (!open) {
      dispatch({ suggestionOpen: false })
    }
  }, [open])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Disable shortcut when AI modals are open
      if (aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen) return

      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen])

  async function fetchSongs() {
    setLoading(true)
    const { songs } = await getSongsList.call()
    if (!songs) return

    setAllSongs(songs)
    setLoading(false)
  }

  async function selectSong() {
    changeSong.call({ title: selectedSong })
    setSelectedSong(null)
    setOpen(false)
  }

  async function queueSong() {
    await addToQueue.call({ song: selectedSong, userId })
    fetchAvailableSuggestions()
    setSelectedSong(null)
  }

  queueChanged.client.useMessage(socket, () => {
    fetchAvailableSuggestions()
  })

  songFileChanged.client.useMessage(socket, () => {
    fetchSongs()
  })

  useEffect(() => {
    fetchSongs()
  }, [songsFolder])

  useKeyboardShortcut(
    {
      key: [KEYS['@']],
      preventDefault: true,
      disable: () => !isAdmin || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        setOpen(!open)
      }
    },
    [setOpen, open, isAdmin, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  useKeyboardShortcut(
    {
      key: [KEYS.Enter],
      preventDefault: true,
      disable: () => !selectedSong || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: (event: KeyboardEvent) => {
        if (event.metaKey) {
          queueSong()
        } else {
          selectSong()
        }
      }
    },
    [selectSong, selectedSong, queueSong, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  const filteredSongs = useMemo(() => {
    if (!query) return allSongs
    return searchSong(query, allSongs)
  }, [allSongs, query])

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput
        autoFocus={!currentSong}
        placeholder="Type a command or search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <CommandLoading>
            <CommandItem>Recherche...</CommandItem>
          </CommandLoading>
        )}
        {!loading &&
          filteredSongs.map((song, index) => (
            <CommandItem
              onSelect={setSelectedSong}
              key={index}
              keywords={[song.author, song.title, ...song.tags]}
              value={song.filename}
            >
              {song.author} - {song.title}
              {flaggedTitles.has(song.filename.normalize('NFC').toLowerCase()) && (
                <span className="ml-2 text-amber-600" title="Grille à corriger" aria-label="Grille à corriger" data-grid-flagged>
                  ⚠
                </span>
              )}
            </CommandItem>
          ))}
        <CommandEmpty>Pas de résultats</CommandEmpty>
      </CommandList>
      {isAdmin ? (
        <Modal
          title="Play or queue?"
          desc="Selectionnez l'action à réaliser"
          open={!!selectedSong}
          onOpenChange={() => {
            setSelectedSong(null)
          }}
        >
          <h2>{selectedSong}</h2>
          <Button onClick={selectSong}>Lancer la chanson (⏎)</Button>
          <Button onClick={queueSong}>Ajouter en file d&apos;attente (⌘ + ⏎)</Button>
        </Modal>
      ) : (
        <Modal
          title="Suggerer cette chanson ?"
          desc="Confirmez pour demander à chanter cette chanson"
          open={!!selectedSong}
          onOpenChange={() => {
            setSelectedSong(null)
          }}
        >
          {availableSuggestions > 0 ? (
            <>
              <p>Vous ne pouvez avoir que {availableSuggestions} chansons dans la file</p>
              <Button onClick={queueSong}>Suggerer la chanson</Button>
            </>
          ) : (
            <>
              <p>Vous avez déjà suggéré 3 chansons !</p>
            </>
          )}
        </Modal>
      )}
    </CommandDialog>
  )
}
