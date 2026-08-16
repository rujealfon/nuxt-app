import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/mysite.db'

// Ensure data directory exists
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
