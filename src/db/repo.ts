import type { Database } from 'better-sqlite3'

export class Repo {
  constructor(private db: Database) {}

  seenMember(channel: string, groupId: string, userId: string): boolean {
    const row = this.db.prepare(
      'SELECT 1 FROM members WHERE channel=? AND group_id=? AND user_id=?'
    ).get(channel, groupId, userId)
    if (row) return true
    this.db.prepare('INSERT INTO members (channel, group_id, user_id) VALUES (?,?,?)')
      .run(channel, groupId, userId)
    return false
  }

  recordMessage(m: { channel: string; groupId: string; userId: string; userName?: string; text: string; timestamp: number }): void {
    this.db.prepare('INSERT INTO messages (channel, group_id, user_id, user_name, text, ts) VALUES (?,?,?,?,?,?)')
      .run(m.channel, m.groupId, m.userId, m.userName ?? '', m.text, m.timestamp)
  }

  recentMessageCount(channel: string, groupId: string, userId: string, sinceMs: number, nowMs: number): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) AS n FROM messages WHERE channel=? AND group_id=? AND user_id=? AND ts>=? AND ts<=?'
    ).get(channel, groupId, userId, nowMs - sinceMs, nowMs) as { n: number }
    return row.n
  }

  messagesOfDay(channel: string, groupId: string, dayStartMs: number, dayEndMs: number): { userName: string; text: string }[] {
    return this.db.prepare(
      'SELECT user_name AS userName, text FROM messages WHERE channel=? AND group_id=? AND ts>=? AND ts<? ORDER BY ts'
    ).all(channel, groupId, dayStartMs, dayEndMs) as { userName: string; text: string }[]
  }

  addKnowledge(k: { question: string; answer: string; tags: string[] }): void {
    this.db.prepare('INSERT INTO knowledge (question, answer, tags) VALUES (?,?,?)')
      .run(k.question, k.answer, k.tags.join(','))
  }

  allKnowledge(): { question: string; answer: string; tags: string[] }[] {
    const rows = this.db.prepare('SELECT question, answer, tags FROM knowledge').all() as { question: string; answer: string; tags: string }[]
    return rows.map((r) => ({ question: r.question, answer: r.answer, tags: r.tags ? r.tags.split(',') : [] }))
  }

  clearKnowledge(): void { this.db.prepare('DELETE FROM knowledge').run() }
}
