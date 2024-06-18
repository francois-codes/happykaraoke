import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const config = sqliteTable('config', {
  id: integer('id').primaryKey(),
  key: text('key'),
  value: text('value')
})
