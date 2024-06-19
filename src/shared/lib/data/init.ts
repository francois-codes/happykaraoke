import { db } from '@shared/db'
import { setSessionConfig } from '../session'
import { config } from '@shared/db/schema'
import { homedir } from 'os'
import { eq } from 'drizzle-orm'

export async function initializeConfig() {
  try {
    const results = await db
      .select({ value: config.value })
      .from(config)
      .where(eq(config.key, 'song_folder'))
    const configValue = results?.[0]?.value

    if (configValue) {
      setSessionConfig({
        songsFolder: configValue.replace('$home', homedir())
      })
    }
  } catch (e) {
    console.error(e)
  }
}
