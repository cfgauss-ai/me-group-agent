import type { Config } from '../config/schema.js'
import type { Repo } from '../db/repo.js'
import type { Channel } from '../channels/channel.js'
import type { ChannelId } from '../types.js'
import { chat } from '../ai/openrouter.js'
import type { ChatFn } from './ai-reply.js'
import cron from 'node-cron'

export function dayBounds(nowMs: number): { start: number; end: number } {
  const d = new Date(nowMs)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return { start, end: start + 86_400_000 }
}

export function resolveChannel(channels: Channel[], want?: ChannelId): Channel | undefined {
  if (want) return channels.find((c) => c.id === want)
  return channels.length === 1 ? channels[0] : undefined
}

export async function postAgendaItem(channel: Channel, item: { text: string; groups: string[] }): Promise<void> {
  for (const g of item.groups) await channel.sendText(g, item.text)
}

export async function buildDailySummary(deps: {
  repo: Repo; channel: Channel; apiKey: string; model: string; groups: string[]; nowMs: number; chatFn?: ChatFn
}): Promise<void> {
  const { start, end } = dayBounds(deps.nowMs)
  const chatFn = deps.chatFn ?? chat
  for (const g of deps.groups) {
    // scoped to THIS channel only — a telegram chat id and a whatsapp jid never collide,
    // and summarizing the wrong channel's messages into a group would be a bug.
    const msgs = deps.repo.messagesOfDay(deps.channel.id, g, start, end)
    if (msgs.length === 0) continue
    // ponytail: cap at the last 200 messages so a busy day can't blow up the token bill.
    const transcript = msgs.slice(-200).map((m) => `${m.userName}: ${m.text}`).join('\n')
    const summary = await chatFn({
      apiKey: deps.apiKey, model: deps.model,
      messages: [
        { role: 'system', content: 'Resuma a conversa do grupo de hoje em até 5 bullets, em português.' },
        { role: 'user', content: transcript },
      ],
    })
    if (summary.trim()) await deps.channel.sendText(g, `📋 Resumo do dia:\n${summary}`)
  }
}

export function startScheduler(deps: {
  config: Config; repo: Repo; channels: Channel[]; apiKey: string; cronImpl?: typeof cron
}): () => void {
  const c = deps.cronImpl ?? cron
  const tasks: { stop: () => void }[] = []
  for (const item of deps.config.agenda) {
    const channel = resolveChannel(deps.channels, item.channel)
    if (!channel) { console.warn(`[scheduler] agenda item "${item.text}" skipped: set "channel" (whatsapp|telegram) when both are enabled`); continue }
    tasks.push(c.schedule(item.cron, () => { void postAgendaItem(channel, item) }))
  }
  if (deps.config.dailySummary.enabled && deps.config.ia.enabled) {
    const channel = resolveChannel(deps.channels, deps.config.dailySummary.channel)
    if (!channel) console.warn('[scheduler] dailySummary skipped: set "channel" when both channels are enabled')
    else tasks.push(c.schedule(deps.config.dailySummary.cron, () => {
      void buildDailySummary({ repo: deps.repo, channel, apiKey: deps.apiKey, model: deps.config.ia.model, groups: deps.config.dailySummary.groups, nowMs: Date.now() })
    }))
  } else if (deps.config.dailySummary.enabled && !deps.config.ia.enabled) {
    console.warn('[scheduler] dailySummary skipped: it uses the AI model to summarize — set ia.enabled=true to use it')
  }
  return () => { for (const t of tasks) t.stop() }
}
