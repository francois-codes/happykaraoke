import { db } from '@shared/db'
import { config } from '@shared/db/schema'
import { eq } from 'drizzle-orm'

export async function setPersistedConfig(key: string, value: string) {
  await db.update(config).set({ value }).where(eq(config.key, key))
}

export async function getPersistedConfig(key: string): Promise<string | null> {
  const results = await db
    .select({ value: config.value })
    .from(config)
    .where(eq(config.key, key))
  return results?.[0]?.value ?? null
}

export async function upsertPersistedConfig(key: string, value: string) {
  const existing = await getPersistedConfig(key)

  if (existing !== null) {
    await db.update(config).set({ value }).where(eq(config.key, key))
  } else {
    await db.insert(config).values({ key, value })
  }
}
