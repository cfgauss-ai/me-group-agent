import type { Config } from '../config/schema.js'
import type { Repo } from '../db/repo.js'
import type { Channel } from '../channels/channel.js'
import type { MemberJoin } from '../types.js'

export function renderTemplate(tpl: string, vars: { nome: string; grupo: string }): string {
  return tpl.replaceAll('{nome}', vars.nome).replaceAll('{grupo}', vars.grupo)
}

export async function handleJoin(
  deps: { config: Config; repo: Repo; channel: Channel },
  e: MemberJoin,
): Promise<void> {
  const { config, repo, channel } = deps
  if (!config.welcome.enabled) return
  if (repo.seenMember(e.channel, e.groupId, e.userId)) return
  const vars = { nome: e.userName, grupo: e.groupId }
  let text = renderTemplate(config.welcome.message, vars)
  if (config.welcome.rules.trim()) text += `\n\n${renderTemplate(config.welcome.rules, vars)}`
  await channel.sendText(e.groupId, text)
}
