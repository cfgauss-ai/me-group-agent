import { describe, it, expect } from 'vitest'
import { FakeChannel } from '../src/channels/channel.js'

describe('FakeChannel', () => {
  it('records sends, removes, deletes', async () => {
    const ch = new FakeChannel('telegram')
    await ch.sendText('g', 'hi'); await ch.removeMember('g', 'u'); await ch.deleteMessage('g', 'm1')
    expect(ch.sent).toEqual([{ groupId: 'g', text: 'hi' }])
    expect(ch.removed).toEqual([{ groupId: 'g', userId: 'u' }])
    expect(ch.deleted).toEqual([{ groupId: 'g', messageRef: 'm1' }])
  })
  it('dispatches emitted events to handlers', async () => {
    const ch = new FakeChannel('telegram')
    let got = ''
    ch.onMessage((e) => { got = e.text })
    await ch.emitMessage({ channel: 'telegram', groupId: 'g', userId: 'u', userName: 'U', text: 'yo', mentionsBot: true, messageRef: '1', timestamp: 0 })
    expect(got).toBe('yo')
  })
})
