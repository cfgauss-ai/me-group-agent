import makeWASocket, { useMultiFileAuthState, DisconnectReason, jidNormalizedUser, type WASocket } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import type { Channel } from './channel.js'
import type { GroupMessage, MemberJoin } from '../types.js'

export function extractText(msg: { conversation?: string; extendedTextMessage?: { text?: string }; imageMessage?: { caption?: string }; videoMessage?: { caption?: string } }): string {
  return msg.conversation ?? msg.extendedTextMessage?.text ?? msg.imageMessage?.caption ?? msg.videoMessage?.caption ?? ''
}
export function mentionsBot(text: string, botName: string): boolean {
  if (!botName) return false
  const esc = botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}([^\\p{L}\\p{N}]|$)`, 'iu').test(text)
}
// selfJid may carry a `:device` suffix (e.g. `123:45@s.whatsapp.net`) that jidNormalizedUser strips.
export function isSelfParticipant(participant: string, selfJid?: string): boolean {
  if (!selfJid) return false
  return jidNormalizedUser(participant) === jidNormalizedUser(selfJid)
}

export class WhatsAppChannel implements Channel {
  readonly id = 'whatsapp' as const
  private sock?: WASocket
  private authDir: string
  private botName: string
  private msgHandlers: ((e: GroupMessage) => void | Promise<void>)[] = []
  private joinHandlers: ((e: MemberJoin) => void | Promise<void>)[] = []

  constructor(opts: { authDir?: string; botName: string }) {
    this.authDir = opts.authDir ?? './data/wa-auth'
    this.botName = opts.botName
  }

  onMessage(h: (e: GroupMessage) => void | Promise<void>): void { this.msgHandlers.push(h) }
  onMemberJoin(h: (e: MemberJoin) => void | Promise<void>): void { this.joinHandlers.push(h) }

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir)
    const sock = makeWASocket({ auth: state })
    this.sock = sock
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (u) => {
      if (u.qr) qrcode.generate(u.qr, { small: true })
      if (u.connection === 'close') {
        const reconnect = (u.lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode !== DisconnectReason.loggedOut
        if (reconnect) setTimeout(() => void this.start(), 3000)
      }
    })
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const wa of messages) {
        const jid = wa.key.remoteJid ?? ''
        if (!jid.endsWith('@g.us') || wa.key.fromMe || !wa.message) continue
        const text = extractText(wa.message as never)
        if (!text) continue
        const e: GroupMessage = {
          channel: 'whatsapp', groupId: jid, userId: wa.key.participant ?? '',
          userName: wa.pushName ?? 'membro', text, mentionsBot: mentionsBot(text, this.botName),
          messageRef: wa.key.id ?? '', timestamp: Number(wa.messageTimestamp) * 1000,
        }
        for (const handler of this.msgHandlers) await handler(e)
      }
    })
    sock.ev.on('group-participants.update', async (u) => {
      if (u.action !== 'add') return
      for (const participant of u.participants) {
        if (isSelfParticipant(participant, sock.user?.id)) continue // the bot joining itself isn't a member join
        const e: MemberJoin = { channel: 'whatsapp', groupId: u.id, userId: participant, userName: participant.split('@')[0] }
        for (const handler of this.joinHandlers) await handler(e)
      }
    })
  }

  private ensure(): WASocket { if (!this.sock) throw new Error('WhatsApp not started'); return this.sock }
  async sendText(groupId: string, text: string): Promise<void> { await this.ensure().sendMessage(groupId, { text }) }
  async removeMember(groupId: string, userId: string): Promise<void> { await this.ensure().groupParticipantsUpdate(groupId, [userId], 'remove') }
  // Deleting another member's message in a group requires the author's jid as `participant`
  // AND the bot being a group admin.
  async deleteMessage(groupId: string, messageRef: string, authorId?: string): Promise<void> {
    await this.ensure().sendMessage(groupId, { delete: { remoteJid: groupId, id: messageRef, participant: authorId, fromMe: false } })
  }
}
