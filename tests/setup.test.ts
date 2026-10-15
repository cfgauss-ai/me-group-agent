import { describe, it, expect } from 'vitest'
import { buildConfigObject } from '../src/setup.js'
import { parseConfig } from '../src/config/schema.js'

describe('buildConfigObject', () => {
  it('produces a config that passes parseConfig', () => {
    const obj = buildConfigObject({
      name: 'ME',
      persona: 'Você é prestativa.',
      whatsapp: true,
      telegram: false,
      iaEnabled: true,
      model: 'anthropic/claude-sonnet-5',
    })
    const parsed = parseConfig(obj)
    expect(parsed.bot.name).toBe('ME')
    expect(parsed.ia.enabled).toBe(true)
    expect(parsed.channels.whatsapp).toBe(true)
  })

  it('rejects config with both channels disabled', () => {
    const obj = buildConfigObject({
      name: 'ME',
      persona: 'Você é prestativa.',
      whatsapp: false,
      telegram: false,
      iaEnabled: true,
      model: 'anthropic/claude-sonnet-5',
    })
    expect(() => parseConfig(obj)).toThrow()
  })
})
