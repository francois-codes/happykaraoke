import { UserType as UserTypeEnum } from '@shared/types'
import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const config = sqliteTable('config', {
  id: integer('id').primaryKey(),
  key: text('key'),
  value: text('value')
})

export const user = sqliteTable('user', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').$type<UserTypeEnum>().notNull(),
  sessionId: integer('sessionId').notNull()
})

export type UserType = InferSelectModel<typeof user>
export type UserInsert = InferInsertModel<typeof user>

export const session = sqliteTable('session', {
  id: integer('id').primaryKey(),
  sessionDate: text('sessionDate').notNull(),
  closed: integer('closed').$type<0 | 1>().notNull().default(0)
})

export type SessionType = InferSelectModel<typeof session>
export type SessionInsert = InferInsertModel<typeof session>

export const sessionLog = sqliteTable('session_log', {
  id: integer('id').primaryKey(),
  song: text('song').notNull(),
  username: text('username'),
  timestamp: text('timestamp').notNull(),
  sessionId: integer('sessionId')
    .notNull()
    .references(() => session.id)
})

export type SessionLog = InferSelectModel<typeof sessionLog>

export const queue = sqliteTable(
  'queue',
  {
    id: integer('id').primaryKey(),
    song: text('song').notNull(),
    order: integer('order').notNull(),
    sessionId: integer('sessionId')
      .notNull()
      .references(() => session.id)
  },
  (table) => ({
    uniqueOrder: unique().on(table.order, table.sessionId)
  })
)

export type QueueType = InferSelectModel<typeof queue>
export type QueueInsert = InferInsertModel<typeof queue>

export const suggestion = sqliteTable('suggestion', {
  id: integer('id').primaryKey(),
  song: text('song').notNull(),
  userId: integer('userId')
    .notNull()
    .references(() => user.id),
  sessionId: integer('sessionId')
    .notNull()
    .references(() => session.id)
})
