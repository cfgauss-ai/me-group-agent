import type { Config } from '../config/schema.js'
import type { Repo } from '../db/repo.js'
import type { Channel } from '../channels/channel.js'
import type { GroupMessage, ModAction } from '../types.js'

export type ModDecision = { violated: boolean; reason?: 'word' | 'link' | 'flood'; action?: ModAction }

export function extractDomains(text: string): string[] {
  const out: string[] = []
  const re = /https?:\/\/([^\s/]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push(m[1].toLowerCase())
  // also catch bare domains like example.org/aula
  const bare = text.match(/\b([a-z0-9-]+\.)+[a-z]{2,}(\.[a-z]{2,})?\b/gi) ?? []
  for (const b of bare) { const host = b.split('/')[0].toLowerCase(); if (!out.includes(host)) out.push(host) }
  return out
}

function hasBlockedWord(text: string, words: string[]): boolean {
  const low = text.toLowerCase()
  return words.some((w) => w && low.includes(w.toLowerCase()))
}

function linkViolation(text: string, allowed: string[]): boolean {
  const domains = extractDomains(text)
  return domains.some((d) => !allowed.some((a) => d === a.toLowerCase() || d.endsWith(`.${a.toLowerCase()}`)))
}

export function evaluate(config: Config, repo: Repo, m: GroupMessage): ModDecision {
  const mod = config.moderation
  if (!mod.enabled) return { violated: false }
  if (hasBlockedWord(m.text, mod.blockedWords)) return { violated: true, reason: 'word', action: mod.wordAction }
  if (mod.linkPolicy.mode === 'allowlist' && linkViolation(m.text, mod.linkPolicy.allowedDomains))
    return { violated: true, reason: 'link', action: mod.linkPolicy.action }
  if (mod.flood.enabled) {
    const count = repo.recentMessageCount(m.channel, m.groupId, m.userId, mod.flood.windowSeconds * 1000, m.timestamp)
    if (count >= mod.flood.maxMessages) return { violated: true, reason: 'flood', action: mod.flood.action }
  }
  return { violated: false }
}

export async function enforce(
  deps: { config: Config; repo: Repo; channel: Channel },
  m: GroupMessage,
): Promise<boolean> {
  const d = evaluate(deps.config, deps.repo, m)
  if (!d.violated) return false
  if (d.action === 'warn') {
    await deps.channel.sendText(m.groupId, `⚠️ ${m.userName}, sua mensagem infringe as regras do grupo (${d.reason}).`)
    return false
  }
  await deps.channel.deleteMessage(m.groupId, m.messageRef, m.userId)
  if (d.action === 'remove') await deps.channel.removeMember(m.groupId, m.userId)
  return true
}
