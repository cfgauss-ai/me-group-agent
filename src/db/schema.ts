import BetterSqlite3 from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
export type Database = BetterSqlite3.Database

export function openDb(file = './data/data.db'): BetterSqlite3.Database {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })  // better-sqlite3 won't create the dir
  return new BetterSqlite3(file)
}

export function migrate(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      channel TEXT, group_id TEXT, user_id TEXT,
      PRIMARY KEY (channel, group_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT, group_id TEXT, user_id TEXT, user_name TEXT,
      text TEXT, ts INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_msg ON messages (channel, group_id, user_id, ts);
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT, answer TEXT, tags TEXT
    );
  `)
}
