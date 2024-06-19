import { db } from '@shared/db'
import { config } from '@shared/db/schema'
import { eq } from 'drizzle-orm'

export async function setPersistedConfig(key: string, value: string) {
  await db.update(config).set({ value }).where(eq(config.key, key))
}
