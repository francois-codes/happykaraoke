import { InferSelectModel } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const config = sqliteTable('config', {
  id: integer('id').primaryKey(),
  key: text('key'),
  value: text('value')
})

export const sessionLog = sqliteTable('session_log', {
  id: integer('id').primaryKey(),
  song: text('song').notNull(),
  timestamp: text('timestamp').notNull()
})

export type SessionLog = InferSelectModel<typeof sessionLog>
