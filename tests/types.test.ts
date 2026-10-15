import { describe, it, expect } from 'vitest'
import { isGroupMessage } from '../src/types.js'
describe('types', () => {
  it('narrows a well-formed GroupMessage', () => {
    const m = { channel: 'telegram', groupId: 'g', userId: 'u', userName: 'U',
      text: 'hi', mentionsBot: false, messageRef: '1', timestamp: 0 }
    expect(isGroupMessage(m)).toBe(true)
  })
  it('rejects a bad shape', () => { expect(isGroupMessage({ channel: 'x' })).toBe(false) })
  it('rejects message without userName', () => {
    const m = { channel: 'telegram', groupId: 'g', userId: 'u',
      text: 'hi', mentionsBot: false, messageRef: '1', timestamp: 0 }
    expect(isGroupMessage(m)).toBe(false)
  })
})
