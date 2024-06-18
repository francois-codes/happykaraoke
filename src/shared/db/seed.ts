import { db } from '.'
import { config } from './schema'

async function seed() {
  await db.insert(config).values({
    id: 1,
    key: 'song_folder',
    value: '$home/Desktop/songs'
  })
}

seed()
