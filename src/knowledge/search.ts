export type KbEntry = { question: string; answer: string; tags: string[] }

// Extract keywords: lowercased, deaccented, ≥3 chars, deduped.
// Also emits 4-char prefix stems for words ≥4 chars to enable fuzzy overlap
// (e.g., both "horas" and "horário" yield "hora", allowing related-term matching).
export function keywords(text: string): string[] {
  const norm = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const words = norm.match(/[a-z0-9]+/g) ?? []
  const filtered = words.filter((w) => w.length >= 3)

  const kws = new Set<string>()
  for (const w of filtered) {
    kws.add(w)
    if (w.length >= 4) {
      // ponytail: 4-char prefix stem is a cheap fuzzy match; false positives possible at larger KB scale — upgrade to a real stemmer/Levenshtein if the KB grows.
      kws.add(w.slice(0, 4))
    }
  }
  return Array.from(kws)
}

export function searchKnowledge(entries: KbEntry[], query: string, max: number): KbEntry[] {
  const qk = keywords(query)
  if (qk.length === 0) return []
  const scored = entries.map((e) => {
    const hay = new Set(keywords(`${e.question} ${e.answer} ${e.tags.join(' ')}`))
    const score = qk.reduce((s, k) => s + (hay.has(k) ? 1 : 0), 0)
    return { e, score }
  }).filter((x) => x.score > 0)
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map((x) => x.e)
}

export function parseKnowledgeMarkdown(md: string): KbEntry[] {
  const blocks = md.split(/^##\s+/m).map((b) => b.trim()).filter(Boolean)
  return blocks.map((block) => {
    const lines = block.split('\n')
    const question = lines[0].trim()
    const rest = lines.slice(1)
    let tags: string[] = []
    const bodyLines: string[] = []
    for (const line of rest) {
      const m = line.match(/^tags:\s*(.+)$/i)
      if (m) tags = m[1].split(',').map((t) => t.trim()).filter(Boolean)
      else bodyLines.push(line)
    }
    return { question, answer: bodyLines.join('\n').trim(), tags }
  })
}
