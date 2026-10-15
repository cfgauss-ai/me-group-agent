import { describe, it, expect } from 'vitest'
import { buildMessages, buildPayload, chat } from '../src/ai/openrouter.js'

describe('buildMessages', () => {
  it('puts persona in system and injects KB', () => {
    const msgs = buildMessages('Você é a ME.', [{ question: 'horário?', answer: '19h', tags: [] }], 'que horas?')
    expect(msgs[0].role).toBe('system')
    expect(msgs[0].content).toContain('Você é a ME.')
    expect(msgs[0].content).toContain('19h')
    expect(msgs.at(-1)).toEqual({ role: 'user', content: 'que horas?' })
  })
  it('says "no KB" cleanly when empty', () => {
    const msgs = buildMessages('p', [], 'oi')
    expect(msgs[0].content).toContain('p')
  })
})

describe('buildPayload', () => {
  it('adds cache_control for anthropic models', () => {
    const p = buildPayload('anthropic/claude-sonnet-5', [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }]) as any
    const sys = p.messages[0]
    expect(Array.isArray(sys.content)).toBe(true)
    expect(sys.content[0].cache_control).toEqual({ type: 'ephemeral' })
  })
  it('keeps plain string content for non-anthropic models', () => {
    const p = buildPayload('openai/gpt-4o', [{ role: 'system', content: 'S' }]) as any
    expect(p.messages[0].content).toBe('S')
  })
})

describe('chat', () => {
  it('posts to openrouter and returns the message content', async () => {
    const fake = (async () => new Response(JSON.stringify({ choices: [{ message: { content: 'resposta' } }] }), { status: 200 })) as unknown as typeof fetch
    const out = await chat({ apiKey: 'k', model: 'anthropic/claude-sonnet-5', messages: [{ role: 'user', content: 'oi' }], fetchImpl: fake })
    expect(out).toBe('resposta')
  })
  it('throws on non-200', async () => {
    const fake = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch
    await expect(chat({ apiKey: 'k', model: 'm', messages: [], fetchImpl: fake })).rejects.toThrow()
  })
})
