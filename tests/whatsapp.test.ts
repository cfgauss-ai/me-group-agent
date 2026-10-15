import { describe, it, expect } from 'vitest'
import { extractText, mentionsBot, isSelfParticipant } from '../src/channels/whatsapp.js'

describe('extractText', () => {
  it('reads conversation, extendedTextMessage and media captions', () => {
    expect(extractText({ conversation: 'oi' })).toBe('oi')
    expect(extractText({ extendedTextMessage: { text: 'ola' } })).toBe('ola')
    expect(extractText({ imageMessage: { caption: 'spam na legenda' } })).toBe('spam na legenda')
    expect(extractText({ videoMessage: { caption: 'vid' } })).toBe('vid')
    expect(extractText({})).toBe('')
  })
})
describe('mentionsBot', () => {
  it('matches the configured bot name case-insensitively', () => {
    expect(mentionsBot('ei ME tudo bem?', 'ME')).toBe(true)
    expect(mentionsBot('bom dia', 'ME')).toBe(false)
  })
  it('requires a whole-word match, not a substring', () => {
    expect(mentionsBot('comentei isso agora', 'Mia')).toBe(false)
    expect(mentionsBot('me ajuda', 'Mia')).toBe(false)
    expect(mentionsBot('Mia, tudo bem?', 'Mia')).toBe(true)
    expect(mentionsBot('fala com a mia por favor', 'Mia')).toBe(true)
    expect(mentionsBot('camia nova', 'Mia')).toBe(false)
  })
})
describe('isSelfParticipant', () => {
  it('matches the bot itself even with a :device suffix on either side', () => {
    expect(isSelfParticipant('123@s.whatsapp.net', '123:45@s.whatsapp.net')).toBe(true)
    expect(isSelfParticipant('123:9@s.whatsapp.net', '123@s.whatsapp.net')).toBe(true)
  })
  it('does not match a different participant', () => {
    expect(isSelfParticipant('456@s.whatsapp.net', '123@s.whatsapp.net')).toBe(false)
  })
  it('is false when the socket has no self jid yet', () => {
    expect(isSelfParticipant('123@s.whatsapp.net', undefined)).toBe(false)
  })
})
