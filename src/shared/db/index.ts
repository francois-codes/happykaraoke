import { resolve } from 'path'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { app } from 'electron'

const dbPath =
  process.env.NODE_ENV === 'production'
    ? resolve(app.getAppPath(), '../resources/db.sqlite')
    : resolve(process.cwd(), './resources/db.sqlite')

console.log({ dbPath })

const sqlite = new Database(dbPath, {})

export const db = drizzle(sqlite, { schema })
