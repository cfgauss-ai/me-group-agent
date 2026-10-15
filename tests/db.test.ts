import { describe, it, expect, beforeEach } from 'vitest'
import { openDb, migrate } from '../src/db/schema.js'
import { Repo } from '../src/db/repo.js'
import type { Database } from '../src/db/schema.js'

// Compile-guard: ensure Database type is not a namespace (catches re-export regression)
const _dbType: Database = openDb(':memory:')

let repo: Repo
beforeEach(() => { const db = openDb(':memory:'); migrate(db); repo = new Repo(db) })

describe('Repo', () => {
  it('seenMember is false first time, true after', () => {
    expect(repo.seenMember('telegram', 'g', 'u')).toBe(false)
    expect(repo.seenMember('telegram', 'g', 'u')).toBe(true)
  })
  it('counts recent messages in window', () => {
    const now = 10_000
    for (let i = 0; i < 3; i++) repo.recordMessage({ channel: 'telegram', groupId: 'g', userId: 'u', text: 'x', timestamp: now - i * 1000 })
    expect(repo.recentMessageCount('telegram', 'g', 'u', 5000, now)).toBe(3)
    expect(repo.recentMessageCount('telegram', 'g', 'u', 1500, now)).toBe(2)
  })
  it('stores and lists knowledge; clear empties it', () => {
    repo.addKnowledge({ question: 'horário?', answer: 'A partir das 19h', tags: ['horario'] })
    expect(repo.allKnowledge()).toHaveLength(1)
    repo.clearKnowledge(); expect(repo.allKnowledge()).toHaveLength(0)
  })
  it('messagesOfDay returns only messages in range', () => {
    repo.recordMessage({ channel: 'telegram', groupId: 'g', userId: 'u', text: 'in', timestamp: 500 })
    repo.recordMessage({ channel: 'telegram', groupId: 'g', userId: 'u', text: 'out', timestamp: 5000 })
    const msgs = repo.messagesOfDay('telegram', 'g', 0, 1000)
    expect(msgs.map((m) => m.text)).toEqual(['in'])
  })
})
