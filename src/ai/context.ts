import type { KbEntry } from '../knowledge/search.js'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export function buildMessages(persona: string, kb: KbEntry[], userText: string): ChatMessage[] {
  const kbText = kb.length
    ? `\n\nBase de conhecimento (use APENAS isto para fatos do grupo; se não cobrir, diga que não sabe):\n` +
      kb.map((e) => `- P: ${e.question}\n  R: ${e.answer}`).join('\n')
    : `\n\n(Sem base de conhecimento carregada. Se perguntarem fatos específicos do grupo, diga que não tem essa informação.)`
  return [
    { role: 'system', content: persona + kbText },
    { role: 'user', content: userText },
  ]
}
