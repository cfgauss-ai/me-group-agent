export type ChannelId = 'whatsapp' | 'telegram'
export interface GroupMessage {
  channel: ChannelId; groupId: string; userId: string; userName: string
  text: string; mentionsBot: boolean; messageRef: string; timestamp: number
}
export interface MemberJoin { channel: ChannelId; groupId: string; userId: string; userName: string }
export type ModAction = 'warn' | 'delete' | 'remove'

export function isGroupMessage(v: unknown): v is GroupMessage {
  const m = v as Record<string, unknown>
  return !!m && (m.channel === 'whatsapp' || m.channel === 'telegram')
    && typeof m.groupId === 'string' && typeof m.userId === 'string'
    && typeof m.userName === 'string'
    && typeof m.text === 'string' && typeof m.mentionsBot === 'boolean'
    && typeof m.messageRef === 'string' && typeof m.timestamp === 'number'
}
