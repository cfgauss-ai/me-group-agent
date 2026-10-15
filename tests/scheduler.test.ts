import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FakeChannel } from '../src/channels/channel.js'
import { openDb, migrate } from '../src/db/schema.js'
import { Repo } from '../src/db/repo.js'
import { parseConfig } from '../src/config/schema.js'
import { postAgendaItem, buildDailySummary, dayBounds, startScheduler, resolveChannel } from '../src/features/scheduler.js'

let repo: Repo
beforeEach(() => { const db = openDb(':memory:'); migrate(db); repo = new Repo(db) })

describe('dayBounds', () => {
  it('end is start + 24h', () => { const b = dayBounds(1_700_000_000_000); expect(b.end - b.start).toBe(86_400_000) })
})

describe('postAgendaItem', () => {
  it('sends text to each group', async () => {
    const ch = new FakeChannel('telegram')
    await postAgendaItem(ch, { text: 'lembrete', groups: ['g1', 'g2'] })
    expect(ch.sent).toEqual([{ groupId: 'g1', text: 'lembrete' }, { groupId: 'g2', text: 'lembrete' }])
  })
})

describe('buildDailySummary', () => {
  it('summarizes the day messages via chat fn', async () => {
    const ch = new FakeChannel('telegram')
    const now = 1_700_000_100_000
    const { start } = dayBounds(now)
    repo.recordMessage({ channel: 'telegram', groupId: 'g1', userId: 'u', userName: 'Ana', text: 'oi', timestamp: start + 10 })
    const chatFn = async () => 'Resumo: 1 mensagem.'
    await buildDailySummary({ repo, channel: ch, apiKey: 'k', model: 'anthropic/claude-sonnet-5', groups: ['g1'], nowMs: now, chatFn })
    expect(ch.sent[0].text).toContain('Resumo')
  })
  it('skips groups with no messages', async () => {
    const ch = new FakeChannel('telegram')
    await buildDailySummary({ repo, channel: ch, apiKey: 'k', model: 'm', groups: ['g1'], nowMs: Date.now(), chatFn: async () => 'x' })
    expect(ch.sent).toHaveLength(0)
  })
})

describe('resolveChannel', () => {
  it('returns the sole channel when want is unset', () => {
    const ch = new FakeChannel('whatsapp')
    expect(resolveChannel([ch], undefined)).toBe(ch)
  })
  it('returns undefined (ambiguous) with two channels and no want', () => {
    expect(resolveChannel([new FakeChannel('whatsapp'), new FakeChannel('telegram')], undefined)).toBeUndefined()
  })
  it('picks the named channel when want is set', () => {
    const tg = new FakeChannel('telegram')
    expect(resolveChannel([new FakeChannel('whatsapp'), tg], 'telegram')).toBe(tg)
  })
})

describe('startScheduler', () => {
  it('registers a cron per resolvable item and skips ambiguous ones', () => {
    const scheduled: string[] = []
    const cronImpl = { schedule: (expr: string, _fn: () => void) => { scheduled.push(expr); return { stop() {} } } } as any
    const cfg = parseConfig({ bot: { name: 'ME', persona: 'p' }, channels: { whatsapp: true, telegram: true },
      agenda: [
        { cron: '0 11 * * *', text: 'bom dia', channel: 'telegram', groups: ['g1'] }, // resolvable
        { cron: '0 12 * * *', text: 'ambígua', groups: ['g2'] },                       // ambiguous -> skipped
      ],
      dailySummary: { enabled: true, cron: '0 21 * * *', channel: 'telegram', groups: ['g1'] },
      ia: { enabled: true } })
    startScheduler({ config: cfg, repo, channels: [new FakeChannel('whatsapp'), new FakeChannel('telegram')], apiKey: 'k', cronImpl })
    expect(scheduled).toEqual(['0 11 * * *', '0 21 * * *'])
  })

  it('registers NO cron for dailySummary when enabled but ia.enabled is false', () => {
    const scheduled: string[] = []
    const cronImpl = { schedule: (expr: string, _fn: () => void) => { scheduled.push(expr); return { stop() {} } } } as any
    const cfg = parseConfig({ bot: { name: 'ME', persona: 'p' }, channels: { whatsapp: true, telegram: false },
      dailySummary: { enabled: true, cron: '0 21 * * *', groups: ['g1'] },
      ia: { enabled: false } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    startScheduler({ config: cfg, repo, channels: [new FakeChannel('whatsapp')], apiKey: 'k', cronImpl })
    expect(scheduled).toEqual([])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dailySummary skipped'))
    warn.mockRestore()
  })
})
