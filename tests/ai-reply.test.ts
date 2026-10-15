import { describe, it, expect, beforeEach } from 'vitest'
import { FakeChannel } from '../src/channels/channel.js'
import { openDb, migrate } from '../src/db/schema.js'
import { Repo } from '../src/db/repo.js'
import { parseConfig } from '../src/config/schema.js'
import { shouldReply, handleMessage, onCooldown } from '../src/features/ai-reply.js'

const cfg = (ia = {}) => parseConfig({ bot: { name: 'ME', persona: 'Você é a ME.' }, channels: { whatsapp: true, telegram: false }, ia: { enabled: true, model: 'anthropic/claude-sonnet-5', triggerOnQuestionMark: true, maxKbResults: 3, ...ia } })
const msg = (text: string, over = {}) => ({ channel: 'telegram' as const, groupId: 'g', userId: 'u', userName: 'U', text, mentionsBot: false, messageRef: 'm', timestamp: 0, ...over })
let repo: Repo
beforeEach(() => { const db = openDb(':memory:'); migrate(db); repo = new Repo(db) })

describe('shouldReply', () => {
  it('true when bot mentioned', () => { expect(shouldReply(cfg(), msg('@ME oi', { mentionsBot: true }))).toBe(true) })
  it('true on question mark when enabled', () => { expect(shouldReply(cfg(), msg('que horas?'))).toBe(true) })
  it('false otherwise', () => { expect(shouldReply(cfg(), msg('bom dia'))).toBe(false) })
  it('false when IA disabled', () => { expect(shouldReply(cfg({ enabled: false }), msg('oi?', { mentionsBot: true }))).toBe(false) })
})

describe('handleMessage', () => {
  it('replies using the KB and injected chat fn', async () => {
    const ch = new FakeChannel('telegram')
    repo.addKnowledge({ question: 'horário?', answer: '19h', tags: ['horario'] })
    let seenMessages: any
    const chatFn = async (opts: any) => { seenMessages = opts.messages; return 'Começa às 19h!' }
    await handleMessage({ config: cfg(), repo, channel: ch, apiKey: 'k', chatFn }, msg('qual o horário?'))
    expect(ch.sent[0].text).toBe('Começa às 19h!')
    expect(seenMessages[0].content).toContain('19h') // KB injected
  })
  it('stays silent when shouldReply is false', async () => {
    const ch = new FakeChannel('telegram')
    const chatFn = async () => 'x'
    await handleMessage({ config: cfg(), repo, channel: ch, apiKey: 'k', chatFn }, msg('bom dia'))
    expect(ch.sent).toHaveLength(0)
  })
  it('enforces per-group cooldown (cost guard)', async () => {
    const ch = new FakeChannel('telegram')
    const store = new Map<string, number>()
    let calls = 0
    const chatFn = async () => { calls++; return 'resp' }
    const cfgCd = () => cfg({ cooldownSeconds: 10 })
    await handleMessage({ config: cfgCd(), repo, channel: ch, apiKey: 'k', chatFn, cooldownStore: store }, msg('oi?', { timestamp: 0 }))
    await handleMessage({ config: cfgCd(), repo, channel: ch, apiKey: 'k', chatFn, cooldownStore: store }, msg('oi?', { timestamp: 5000 }))   // within 10s -> blocked
    await handleMessage({ config: cfgCd(), repo, channel: ch, apiKey: 'k', chatFn, cooldownStore: store }, msg('oi?', { timestamp: 12000 }))  // after -> allowed
    expect(calls).toBe(2)
  })
})

describe('onCooldown', () => {
  it('blocks within window, allows after, stamps on allow', () => {
    const store = new Map<string, number>()
    const m = (ts: number) => ({ channel: 'telegram' as const, groupId: 'g', userId: 'u', userName: 'U', text: '?', mentionsBot: false, messageRef: 'm', timestamp: ts })
    expect(onCooldown(store, m(0), 10)).toBe(false)   // first: not on cooldown, stamps
    expect(onCooldown(store, m(5000), 10)).toBe(true)  // within
    expect(onCooldown(store, m(11000), 10)).toBe(false) // after, re-stamps
  })
})
