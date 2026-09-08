import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '@shared/db/schema'

// Exercise real SQLite queries with foreign keys; never open the user's database.
export const sqlite = new Database(':memory:')
sqlite.pragma('foreign_keys = ON')
sqlite.exec(`
  CREATE TABLE session (id INTEGER PRIMARY KEY, sessionDate TEXT NOT NULL,
    closed INTEGER NOT NULL DEFAULT 0, scrollHostUserId INTEGER);
  CREATE TABLE user (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
    type TEXT NOT NULL, sessionId INTEGER NOT NULL);
  CREATE TABLE session_log (id INTEGER PRIMARY KEY, song TEXT NOT NULL,
    username TEXT, timestamp TEXT NOT NULL, sessionId INTEGER NOT NULL REFERENCES session(id));
  CREATE TABLE queue (id INTEGER PRIMARY KEY, song TEXT NOT NULL, "order" INTEGER NOT NULL,
    userId INTEGER REFERENCES user(id), sessionId INTEGER NOT NULL REFERENCES session(id),
    UNIQUE("order", sessionId));
`)
export const db = drizzle(sqlite, { schema })
