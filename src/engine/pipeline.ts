import type { Config } from '../config/schema.js'
import type { Repo } from '../db/repo.js'
import type { Channel } from '../channels/channel.js'
import type { GroupMessage, MemberJoin } from '../types.js'
import { enforce } from '../features/moderation.js'
import { handleMessage, type ChatFn } from '../features/ai-reply.js'
import { handleJoin } from '../features/welcome.js'

export function makeHandlers(deps: { config: Config; repo: Repo; channel: Channel; apiKey: string; chatFn?: ChatFn }) {
  const onMessage = async (m: GroupMessage): Promise<void> => {
    try {
      deps.repo.recordMessage({ channel: m.channel, groupId: m.groupId, userId: m.userId, userName: m.userName, text: m.text, timestamp: m.timestamp })
      const blocked = await enforce({ config: deps.config, repo: deps.repo, channel: deps.channel }, m)
      if (blocked) return
      await handleMessage({ config: deps.config, repo: deps.repo, channel: deps.channel, apiKey: deps.apiKey, chatFn: deps.chatFn }, m)
    } catch (err) {
      console.error('[ME] onMessage error:', err)
    }
  }
  const onJoin = async (e: MemberJoin): Promise<void> => {
    try {
      await handleJoin({ config: deps.config, repo: deps.repo, channel: deps.channel }, e)
    } catch (err) {
      console.error('[ME] onJoin error:', err)
    }
  }
  return { onMessage, onJoin }
}

export function attach(channel: Channel, deps: { config: Config; repo: Repo; apiKey: string; chatFn?: ChatFn }): void {
  const { onMessage, onJoin } = makeHandlers({ ...deps, channel })
  channel.onMessage(onMessage)
  channel.onMemberJoin(onJoin)
}
