import { describe, it, expect, beforeEach } from 'vitest'
import { FakeChannel } from '../src/channels/channel.js'
import { openDb, migrate } from '../src/db/schema.js'
import { Repo } from '../src/db/repo.js'
import { parseConfig } from '../src/config/schema.js'
import { evaluate, enforce, extractDomains } from '../src/features/moderation.js'

const base = (mod = {}) => parseConfig({ bot: { name: 'ME', persona: 'p' }, channels: { whatsapp: true, telegram: false }, moderation: { enabled: true, blockedWords: ['spam'], linkPolicy: { mode: 'allowlist', allowedDomains: ['example.org'], action: 'delete' }, flood: { enabled: true, maxMessages: 3, windowSeconds: 10, action: 'remove' }, wordAction: 'delete', ...mod } })
const msg = (text: string, over = {}) => ({ channel: 'telegram' as const, groupId: 'g', userId: 'u', userName: 'U', text, mentionsBot: false, messageRef: 'm', timestamp: 1000, ...over })
let repo: Repo
beforeEach(() => { const db = openDb(':memory:'); migrate(db); repo = new Repo(db) })

describe('extractDomains', () => {
  it('pulls hostnames from urls', () => {
    expect(extractDomains('veja https://evil.example.com/x e http://example.org')).toEqual(['evil.example.com', 'example.org'])
  })
})

describe('evaluate', () => {
  it('flags a blocked word', () => {
    expect(evaluate(base(), repo, msg('isso é SPAM'))).toMatchObject({ violated: true, reason: 'word', action: 'delete' })
  })
  it('flags a disallowed link but allows allowlisted', () => {
    expect(evaluate(base(), repo, msg('http://evil.example.com')).violated).toBe(true)
    expect(evaluate(base(), repo, msg('veja example.org/aula')).violated).toBe(false)
  })
  it('flags flood past the threshold', () => {
    for (let i = 0; i < 3; i++) repo.recordMessage({ channel: 'telegram', groupId: 'g', userId: 'u', text: 'oi', timestamp: 1000 })
    expect(evaluate(base(), repo, msg('oi', { timestamp: 1000 }))).toMatchObject({ violated: true, reason: 'flood', action: 'remove' })
  })
  it('passes a clean message', () => {
    expect(evaluate(base(), repo, msg('bom dia pessoal')).violated).toBe(false)
  })
  it('does nothing when moderation disabled', () => {
    expect(evaluate(base({ enabled: false }), repo, msg('spam')).violated).toBe(false)
  })
})

describe('enforce', () => {
  it('delete action deletes and blocks pipeline', async () => {
    const ch = new FakeChannel('telegram')
    const blocked = await enforce({ config: base(), repo, channel: ch }, msg('spam'))
    expect(blocked).toBe(true)
    expect(ch.deleted).toHaveLength(1)
  })
  it('warn action warns but does not block', async () => {
    const ch = new FakeChannel('telegram')
    const blocked = await enforce({ config: base({ wordAction: 'warn' }), repo, channel: ch }, msg('spam'))
    expect(blocked).toBe(false)
    expect(ch.sent).toHaveLength(1)
    expect(ch.deleted).toHaveLength(0)
  })
})
