import { createEndpoint } from '@shared/types/endpoints'

export interface GenerateSongRequest {
  songName: string
  artistName: string
  tags?: string
}

export interface SaveSongRequest {
  filename: string
  content: string
}

export const setOpenAIKey = createEndpoint<{ apiKey: string }, any>({
  method: 'post',
  url: '/set-openai-key',
  handler: async (req, res) => {
    const { apiKey } = req.body

    if (!apiKey || apiKey.trim() === '') {
      res.status(400).json({ error: 'API key is required' })
      return
    }

    const { upsertPersistedConfig } = await import('@shared/lib/data/config')
    await upsertPersistedConfig('openai_api_key', apiKey)
    res.sendStatus(200)
  }
})

export const getOpenAIKey = createEndpoint<unknown, { hasKey: boolean }>({
  method: 'get',
  url: '/get-openai-key',
  handler: async (_, res) => {
    const { getPersistedConfig } = await import('@shared/lib/data/config')
    const apiKey = await getPersistedConfig('openai_api_key')
    res.status(200).json({ hasKey: !!apiKey && apiKey.trim() !== '' })
  }
})

export const generateSong = createEndpoint<GenerateSongRequest, any>({
  method: 'post',
  url: '/generate-song',
  handler: async (req, res) => {
    const { songName, artistName, tags } = req.body

    if (!songName || !artistName) {
      res.status(400).json({ error: 'Song name and artist name are required' })
      return
    }

    const { getPersistedConfig } = await import('@shared/lib/data/config')
    const apiKey = await getPersistedConfig('openai_api_key')

    if (!apiKey) {
      res.status(400).json({ error: 'Clé API Perplexity non configurée. Veuillez d\'abord configurer votre clé.' })
      return
    }

    try {
      const { generateText } = await import('ai')
      const { createPerplexity } = await import('@ai-sdk/perplexity')
      const prompt = `You are a music transcription assistant with web search capabilities. Search the internet to find accurate lyrics and chords for the song "${songName}" by ${artistName}.

CRITICAL INSTRUCTIONS:
- SEARCH the web for this song on sites like Ultimate Guitar, Chordify, AZChords, or other chord/lyrics sites
- You MUST provide accurate, real lyrics and chords from this actual song
- DO NOT make up, invent, or hallucinate any lyrics or chords
- If you cannot find the song after searching, respond with: "ERROR: Cannot find accurate transcription for this song"
- Only provide transcriptions you are highly confident are correct from your web search
- The lyrics must match the actual song exactly
- The chords must be accurate to the actual song from a reliable source

Format the output EXACTLY as follows (this is critical):

1. First line: Song title
2. Second line: Artist name
3. Third line: Musical key (single letter A-G, may include # or b, e.g., "C", "D#", "Bb")
4. Fourth line: Space-separated tags (e.g., "rock upbeat classic" or leave empty)
5. Fifth line: BLANK LINE (required)
6. Then the song content with:
   - Section headers starting with [ like [Verse 1], [Chorus], [Bridge]
   - Chord lines (only chords, space-separated)
   - Lyric lines (the words)
   - Blank lines between sections

Example format:
Let It Be
The Beatles
C
classic rock ballad

[Verse 1]
C                G
When I find myself in times of trouble
Am              F
Mother Mary comes to me
C                G              F    C
Speaking words of wisdom, let it be

[Chorus]
C                G
Let it be, let it be
Am              F
Let it be, let it be

IMPORTANT:
- Make sure chords are aligned above the correct syllables
- Use standard chord notation (C, Am, F, G7, Dsus4, etc.)
- Include section headers
- The key on line 3 should be just one letter with optional # or b
- DO NOT add any introductory text or explanations
- Start immediately with the song title

Find and format "${songName}" by ${artistName} now:`

      const perplexity = createPerplexity({ apiKey })
      const result = await generateText({
        model: perplexity('sonar-pro'),
        prompt
      })

      const content = result.text.trim()

      // Check if the AI couldn't find the song
      if (content.startsWith('ERROR:')) {
        res.status(404).json({
          error: 'Impossible de trouver une transcription précise pour cette chanson. Veuillez vérifier le nom de la chanson et de l\'artiste, ou essayez une autre chanson.'
        })
        return
      }

      const lines = content.split('\n')

      if (lines.length < 5) {
        throw new Error('Le format de la chanson générée est invalide. La chanson pourrait ne pas être disponible.')
      }

      const title = lines[0].trim()
      const author = lines[1].trim()
      const key = lines[2].trim()
      const tagsLine = lines[3].trim()

      // Generate filename from title (sanitize for filesystem)
      const filename = author
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() + ' - ' + title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() + '.txt'

      res.status(200).json({
        title,
        author,
        key,
        tags: tagsLine || tags || '',
        content,
        filename
      })
    } catch (error: any) {
      console.error('Error generating song:', error)
      res.status(500).json({
        error: error.message || 'Failed to generate song. Please try again.'
      })
    }
  }
})

export const saveSong = createEndpoint<SaveSongRequest, any>({
  method: 'post',
  url: '/save-song',
  handler: async (req, res) => {
    const { filename, content } = req.body

    if (!filename || !content) {
      res.status(400).json({ error: 'Filename and content are required' })
      return
    }

    const { getSessionConfig } = await import('@shared/lib/session')
    const { songsFolder } = getSessionConfig()

    if (!songsFolder) {
      res.status(400).json({ error: 'Songs folder is not configured' })
      return
    }

    try {
      const { writeFileSync } = await import('fs')
      const { join } = await import('path')
      const { socketEmitter } = await import('@shared/server/socketEmitter')

      const filePath = join(songsFolder, filename)
      writeFileSync(filePath, content, 'utf-8')

      // Emit event to reload songs
      socketEmitter.emit('folder:changed')

      res.status(200).json({ success: true, filePath })
    } catch (error: any) {
      console.error('Error saving song:', error)
      res.status(500).json({
        error: error.message || 'Failed to save song file'
      })
    }
  }
})
