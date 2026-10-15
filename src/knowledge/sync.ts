import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseKnowledgeMarkdown } from './search.js'
import type { Repo } from '../db/repo.js'

export function syncKnowledge(repo: Repo, dir = './knowledge'): number {
  repo.clearKnowledge()
  if (!existsSync(dir)) return 0
  let count = 0
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    for (const entry of parseKnowledgeMarkdown(readFileSync(join(dir, file), 'utf8'))) {
      if (entry.question && entry.answer) { repo.addKnowledge(entry); count++ }
    }
  }
  return count
}

// CLI entry (npm run kb:sync)
import { pathToFileURL } from 'node:url'
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { openDb, migrate } = await import('../db/schema.js')
  const { Repo } = await import('../db/repo.js')
  const db = openDb(); migrate(db)
  const n = syncKnowledge(new Repo(db))
  console.log(`Loaded ${n} knowledge entries.`)
}
