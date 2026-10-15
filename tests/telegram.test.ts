import { describe, it, expect } from 'vitest'
import { mapTelegramText } from '../src/channels/telegram.js'

describe('mapTelegramText', () => {
  it('detects @mention of the bot', () => {
    expect(mapTelegramText({ text: '@mebot qual horário?', botUsername: 'mebot' })).toEqual({ text: '@mebot qual horário?', mentionsBot: true })
  })
  it('no mention when bot not named', () => {
    expect(mapTelegramText({ text: 'bom dia', botUsername: 'mebot' }).mentionsBot).toBe(false)
  })
})
