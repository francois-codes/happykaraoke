import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/shared/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './resources/db.sqlite'
  },
  migrations: {
    table: 'drizzle_migrations'
  },
  verbose: true,
  strict: true
})
