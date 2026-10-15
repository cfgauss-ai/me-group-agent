import { describe, it, expect, beforeEach } from 'vitest'
import { FakeChannel } from '../src/channels/channel.js'
import { openDb, migrate } from '../src/db/schema.js'
import { Repo } from '../src/db/repo.js'
import { parseConfig } from '../src/config/schema.js'
import { handleJoin, renderTemplate } from '../src/features/welcome.js'

const cfg = (over = {}) => parseConfig({ bot: { name: 'ME', persona: 'p' }, channels: { whatsapp: true, telegram: false }, welcome: { enabled: true, message: 'Oi {nome}, bem-vindo a {grupo}!', rules: 'Regra 1.' }, ...over })
let repo: Repo
beforeEach(() => { const db = openDb(':memory:'); migrate(db); repo = new Repo(db) })

describe('welcome', () => {
  it('renders template vars', () => {
    expect(renderTemplate('Oi {nome}!', { nome: 'Ana', grupo: 'G' })).toBe('Oi Ana!')
  })
  it('greets a new member once with message + rules', async () => {
    const ch = new FakeChannel('telegram')
    const e = { channel: 'telegram' as const, groupId: 'g', userId: 'u', userName: 'Ana' }
    await handleJoin({ config: cfg(), repo, channel: ch }, e)
    await handleJoin({ config: cfg(), repo, channel: ch }, e) // second time: already seen
    expect(ch.sent).toHaveLength(1)
    expect(ch.sent[0].text).toContain('Oi Ana')
    expect(ch.sent[0].text).toContain('Regra 1.')
  })
  it('does nothing when disabled', async () => {
    const ch = new FakeChannel('telegram')
    await handleJoin({ config: cfg({ welcome: { enabled: false, message: 'x', rules: '' } }), repo, channel: ch }, { channel: 'telegram', groupId: 'g', userId: 'u', userName: 'Ana' })
    expect(ch.sent).toHaveLength(0)
  })
})
