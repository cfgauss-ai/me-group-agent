import { describe, it, expect, beforeEach } from 'vitest'
import { FakeChannel } from '../src/channels/channel.js'
import { openDb, migrate } from '../src/db/schema.js'
import { Repo } from '../src/db/repo.js'
import { parseConfig } from '../src/config/schema.js'
import { makeHandlers } from '../src/engine/pipeline.js'

const cfg = () => parseConfig({ bot: { name: 'ME', persona: 'p' }, channels: { whatsapp: true, telegram: false }, moderation: { enabled: true, blockedWords: ['spam'], wordAction: 'delete' }, ia: { enabled: true, triggerOnQuestionMark: true } })
const msg = (text: string, over = {}) => ({ channel: 'telegram' as const, groupId: 'g', userId: 'u', userName: 'U', text, mentionsBot: false, messageRef: 'm', timestamp: 0, ...over })
let repo: Repo
beforeEach(() => { const db = openDb(':memory:'); migrate(db); repo = new Repo(db) })

describe('pipeline', () => {
  it('blocked message is deleted and never reaches AI', async () => {
    const ch = new FakeChannel('telegram')
    let aiCalled = false
    const chatFn = async () => { aiCalled = true; return 'x' }
    const { onMessage } = makeHandlers({ config: cfg(), repo, channel: ch, apiKey: 'k', chatFn })
    await onMessage(msg('isso é spam?'))
    expect(ch.deleted).toHaveLength(1)
    expect(aiCalled).toBe(false)
  })
  it('clean question reaches AI', async () => {
    const ch = new FakeChannel('telegram')
    const chatFn = async () => 'resposta'
    const { onMessage } = makeHandlers({ config: cfg(), repo, channel: ch, apiKey: 'k', chatFn })
    await onMessage(msg('tudo bem?'))
    expect(ch.sent.map((s) => s.text)).toContain('resposta')
  })
  it('records every message (for flood/summary)', async () => {
    const ch = new FakeChannel('telegram')
    const { onMessage } = makeHandlers({ config: cfg(), repo, channel: ch, apiKey: 'k', chatFn: async () => '' })
    await onMessage(msg('oi'))
    expect(repo.recentMessageCount('telegram', 'g', 'u', 10000, 0)).toBe(1)
  })
  it('swallows errors thrown by chatFn instead of crashing the process', async () => {
    const ch = new FakeChannel('telegram')
    const chatFn = async () => { throw new Error('OpenRouter 429') }
    const { onMessage } = makeHandlers({ config: cfg(), repo, channel: ch, apiKey: 'k', chatFn })
    await expect(onMessage(msg('tudo bem?'))).resolves.toBeUndefined()
  })
})
