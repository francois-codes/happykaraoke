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

export function CommandMenu() {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [songResults, setSongResults] = useState<
    { tags: string[]; author: string; title: string; fileName: string }[]
  >([])

  const { currentSong, songsFolder } = useStore()
  const dispatch = useDispatch()

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
    setSongResults(songs)
    setLoading(false)
  }

  async function selectSong(title: string) {
    changeSong.call({ title })
    setOpen(false)
  }

  useEffect(() => {
    fetchSongs()
  }, [songsFolder])

  return (
    <CommandDialog
      open={open || Boolean(!currentSong && songsFolder)}
      onOpenChange={setOpen}
      shouldFilter={false}
    >
      <CommandInput
        autoFocus={!currentSong}
        placeholder="Type a command or search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && <CommandLoading>Recherche...</CommandLoading>}
        {!loading &&
          songResults.map((song, index) => (
            <CommandItem
              onSelect={selectSong}
              key={index}
              keywords={[song.author, song.title, ...song.tags]}
              value={song.fileName}
            >
              {song.author} - {song.title}
            </CommandItem>
          ))}
        <CommandEmpty>Pas de résultats</CommandEmpty>
      </CommandList>
    </CommandDialog>
  )
}
