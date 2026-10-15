import { Bot } from 'grammy'
import type { Channel } from './channel.js'
import type { GroupMessage, MemberJoin } from '../types.js'

export function mapTelegramText(ctx: { text: string; botUsername: string }): { text: string; mentionsBot: boolean } {
  const mentionsBot = ctx.botUsername.length > 0 && ctx.text.toLowerCase().includes(`@${ctx.botUsername.toLowerCase()}`)
  return { text: ctx.text, mentionsBot }
}

export class TelegramChannel implements Channel {
  readonly id = 'telegram' as const
  private bot: Bot
  private botUsername = ''
  private botId = ''
  private msgHandlers: ((e: GroupMessage) => void | Promise<void>)[] = []
  private joinHandlers: ((e: MemberJoin) => void | Promise<void>)[] = []

  constructor(token: string, botUsername = '') { this.bot = new Bot(token); this.botUsername = botUsername }

  onMessage(h: (e: GroupMessage) => void | Promise<void>): void { this.msgHandlers.push(h) }
  onMemberJoin(h: (e: MemberJoin) => void | Promise<void>): void { this.joinHandlers.push(h) }

  async start(): Promise<void> {
    const me = await this.bot.api.getMe()
    this.botUsername = me.username ?? this.botUsername
    this.botId = String(me.id)

    this.bot.on('message:text', async (ctx) => {
      if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') return
      const mapped = mapTelegramText({ text: ctx.message.text, botUsername: this.botUsername })
      const e: GroupMessage = {
        channel: 'telegram', groupId: String(ctx.chat.id), userId: String(ctx.from.id),
        userName: ctx.from.first_name ?? ctx.from.username ?? 'membro',
        text: mapped.text, mentionsBot: mapped.mentionsBot,
        messageRef: String(ctx.message.message_id), timestamp: ctx.message.date * 1000,
      }
      for (const handler of this.msgHandlers) await handler(e)
    })

    this.bot.on('message:new_chat_members', async (ctx) => {
      for (const m of ctx.message.new_chat_members) {
        if (String(m.id) === this.botId) continue // the bot joining itself isn't a member join
        const e: MemberJoin = { channel: 'telegram', groupId: String(ctx.chat.id), userId: String(m.id), userName: m.first_name ?? m.username ?? 'membro' }
        for (const handler of this.joinHandlers) await handler(e)
      }
    })

    void this.bot.start()
  }

  async sendText(groupId: string, text: string): Promise<void> { await this.bot.api.sendMessage(Number(groupId), text) }
  // 'remove' uses ban then unban so the user is kicked but can rejoin (a plain ban is permanent).
  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.bot.api.banChatMember(Number(groupId), Number(userId))
    await this.bot.api.unbanChatMember(Number(groupId), Number(userId))
  }
  // Telegram deletes by (chat, message) — no author needed, so authorId is ignored.
  async deleteMessage(groupId: string, messageRef: string, _authorId?: string): Promise<void> { await this.bot.api.deleteMessage(Number(groupId), Number(messageRef)) }
}
