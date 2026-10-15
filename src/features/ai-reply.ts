import type { Config } from '../config/schema.js'
import type { Repo } from '../db/repo.js'
import type { Channel } from '../channels/channel.js'
import type { GroupMessage } from '../types.js'
import { searchKnowledge } from '../knowledge/search.js'
import { buildMessages, chat, type ChatMessage } from '../ai/openrouter.js'

export type ChatFn = (opts: { apiKey: string; model: string; messages: ChatMessage[] }) => Promise<string>

const defaultCooldownStore = new Map<string, number>()

export function shouldReply(config: Config, m: GroupMessage): boolean {
  if (!config.ia.enabled) return false
  if (m.mentionsBot) return true
  if (config.ia.triggerOnQuestionMark && m.text.trim().endsWith('?')) return true
  return false
}

// Returns true if still on cooldown (caller should skip). When NOT on cooldown, stamps the time.
export function onCooldown(store: Map<string, number>, m: GroupMessage, cooldownSeconds: number): boolean {
  if (cooldownSeconds <= 0) return false
  const key = `${m.channel}:${m.groupId}`
  const last = store.get(key)
  if (last !== undefined && m.timestamp - last < cooldownSeconds * 1000) return true
  store.set(key, m.timestamp)
  return false
}

export async function handleMessage(
  deps: { config: Config; repo: Repo; channel: Channel; apiKey: string; chatFn?: ChatFn; cooldownStore?: Map<string, number> },
  m: GroupMessage,
): Promise<void> {
  const { config, repo, channel, apiKey } = deps
  if (!shouldReply(config, m)) return
  if (onCooldown(deps.cooldownStore ?? defaultCooldownStore, m, config.ia.cooldownSeconds)) return
  const kb = searchKnowledge(repo.allKnowledge(), m.text, config.ia.maxKbResults)
  const messages = buildMessages(config.bot.persona, kb, m.text)
  const chatFn = deps.chatFn ?? chat
  const reply = await chatFn({ apiKey, model: config.ia.model, messages })
  if (reply.trim()) await channel.sendText(m.groupId, reply)
}
