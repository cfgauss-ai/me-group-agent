import { buildMessages, type ChatMessage } from './context.js'
export { buildMessages }
export type { ChatMessage }

export function buildPayload(model: string, messages: ChatMessage[]): Record<string, unknown> {
  const isAnthropic = model.startsWith('anthropic/')
  const out = messages.map((m) => {
    if (isAnthropic && m.role === 'system') {
      return { role: m.role, content: [{ type: 'text', text: m.content, cache_control: { type: 'ephemeral' } }] }
    }
    return { role: m.role, content: m.content }
  })
  return { model, messages: out }
}

export async function chat(opts: {
  apiKey: string; model: string; messages: ChatMessage[]; fetchImpl?: typeof fetch
}): Promise<string> {
  const f = opts.fetchImpl ?? fetch
  const res = await f('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(opts.model, opts.messages)),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content ?? ''
}
