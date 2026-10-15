import type { ChannelId, GroupMessage, MemberJoin } from '../types.js'

export interface Channel {
  readonly id: ChannelId
  start(): Promise<void>
  onMessage(handler: (e: GroupMessage) => void | Promise<void>): void
  onMemberJoin(handler: (e: MemberJoin) => void | Promise<void>): void
  sendText(groupId: string, text: string): Promise<void>
  removeMember(groupId: string, userId: string): Promise<void>
  deleteMessage(groupId: string, messageRef: string, authorId?: string): Promise<void>
}

export class FakeChannel implements Channel {
  sent: { groupId: string; text: string }[] = []
  removed: { groupId: string; userId: string }[] = []
  deleted: { groupId: string; messageRef: string; authorId?: string }[] = []
  private msgHandlers: ((e: GroupMessage) => void | Promise<void>)[] = []
  private joinHandlers: ((e: MemberJoin) => void | Promise<void>)[] = []
  constructor(readonly id: ChannelId) {}
  async start(): Promise<void> {}
  onMessage(h: (e: GroupMessage) => void | Promise<void>): void { this.msgHandlers.push(h) }
  onMemberJoin(h: (e: MemberJoin) => void | Promise<void>): void { this.joinHandlers.push(h) }
  async sendText(groupId: string, text: string): Promise<void> { this.sent.push({ groupId, text }) }
  async removeMember(groupId: string, userId: string): Promise<void> { this.removed.push({ groupId, userId }) }
  async deleteMessage(groupId: string, messageRef: string, authorId?: string): Promise<void> { this.deleted.push({ groupId, messageRef, authorId }) }
  async emitMessage(e: GroupMessage): Promise<void> { for (const h of this.msgHandlers) await h(e) }
  async emitJoin(e: MemberJoin): Promise<void> { for (const h of this.joinHandlers) await h(e) }
}
