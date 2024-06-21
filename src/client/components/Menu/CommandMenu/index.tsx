import { useState, useEffect } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from '../../ui/command'

import { CommandLoading } from 'cmdk'
import { useDispatch, useStore } from '@/store'
import { changeSong, getSongsList } from '@shared/endpoints/song'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'
import { searchSong } from '@shared/lib/data/songs'

type Songs = Awaited<ReturnType<typeof getSongsList.call>>['songs']

export function CommandMenu() {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [allSongs, setAllSongs] = useState<Songs>([])
  const [filteredSongs, setFilteredSongs] = useState<Songs>([])

  const { currentSong, songsFolder } = useStore()
  const dispatch = useDispatch()

  useEffect(() => {
    if (!currentSong && songsFolder) {
      dispatch({ searchOpen: true })
      setOpen(true)
    }
  }, [currentSong, songsFolder])

  useEffect(() => {
    dispatch({ searchOpen: open })
  }, [open])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  async function fetchSongs() {
    setLoading(true)
    const { songs } = await getSongsList.call()
    if (!songs) return

    songs.forEach((song) => {
      if (song.author.includes('|EM') || song.title.includes('Intro')) {
        console.log({ song })
      }
    })

    setAllSongs(songs)
    setLoading(false)
  }

  async function selectSong(title: string) {
    changeSong.call({ title })
    setOpen(false)
  }

  useEffect(() => {
    fetchSongs()
  }, [songsFolder])

  useKeyboardShortcut(
    {
      key: [KEYS['@']],
      preventDefault: true,
      handler: () => {
        setOpen(!open)
      }
    },
    [setOpen, open]
  )

  useEffect(() => {
    if (!query) {
      setFilteredSongs(allSongs)
    } else {
      const results = searchSong(query, allSongs)
      setFilteredSongs(results)
    }
  }, [query, allSongs])

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
              onSelect={selectSong}
              key={index}
              keywords={[song.author, song.title, ...song.tags]}
              value={song.filename}
            >
              {song.author} - {song.title}
            </CommandItem>
          ))}
        <CommandEmpty>Pas de résultats</CommandEmpty>
      </CommandList>
    </CommandDialog>
  )
}
