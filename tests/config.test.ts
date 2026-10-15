import { describe, it, expect } from 'vitest'
import { parseConfig } from '../src/config/schema.js'

const minimal = {
  bot: { name: 'ME', persona: 'Você é prestativa.' },
  channels: { whatsapp: true, telegram: false },
  welcome: { enabled: true, message: 'Oi {nome}!', rules: 'Seja gentil.' },
  moderation: { enabled: false, blockedWords: [], linkPolicy: { mode: 'off', allowedDomains: [], action: 'warn' }, flood: { enabled: false, maxMessages: 5, windowSeconds: 10, action: 'warn' }, wordAction: 'delete' },
  ia: { enabled: false, model: 'anthropic/claude-sonnet-5', triggerOnQuestionMark: false, maxKbResults: 3 },
  agenda: [],
  dailySummary: { enabled: false, cron: '0 21 * * *', groups: [] },
}

describe('parseConfig', () => {
  it('accepts a valid config', () => { expect(parseConfig(minimal).bot.name).toBe('ME') })
  it('applies defaults for optional blocks', () => {
    const c = parseConfig({ bot: { name: 'ME', persona: 'p' }, channels: { whatsapp: true, telegram: false } })
    expect(c.moderation.enabled).toBe(false)
    expect(c.ia.enabled).toBe(false)
    expect(c.agenda).toEqual([])
  })
  it('rejects missing bot.name', () => { expect(() => parseConfig({ channels: { whatsapp: true, telegram: false } })).toThrow() })
  it('rejects a channels config with both false', () => {
    expect(() => parseConfig({ bot: { name: 'ME', persona: 'p' }, channels: { whatsapp: false, telegram: false } })).toThrow()
  })
})
