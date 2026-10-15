import { describe, it, expect } from 'vitest'
import { keywords, searchKnowledge, parseKnowledgeMarkdown } from '../src/knowledge/search.js'

const kb = [
  { question: 'Qual o horário do grupo?', answer: 'A partir das 19h.', tags: ['horario'] },
  { question: 'Como entro na comunidade?', answer: 'Pelo link fixado.', tags: ['acesso'] },
]

describe('keywords', () => {
  it('lowercases, deaccents and drops short words', () => {
    expect(keywords('Qual o HORÁRIO do grupo?')).toContain('horario')
    expect(keywords('Qual o HORÁRIO do grupo?')).not.toContain('o')
  })
})

describe('searchKnowledge', () => {
  it('REGRESSÃO: matches by keyword, not the whole phrase', () => {
    // the full user sentence is NOT a substring of any stored question
    const hits = searchKnowledge(kb, 'me diz por favor que horas começa hoje', 3)
    expect(hits[0].answer).toBe('A partir das 19h.')
  })
  it('returns [] when nothing overlaps', () => {
    expect(searchKnowledge(kb, 'preço do bitcoin', 3)).toEqual([])
  })
  it('caps results at max', () => {
    expect(searchKnowledge(kb, 'horário comunidade grupo link', 1)).toHaveLength(1)
  })
})

describe('parseKnowledgeMarkdown', () => {
  it('parses ## heading + body + tags line', () => {
    const md = `## Qual o horário?\nA partir das 19h.\ntags: horario, agenda\n\n## Outra\nResposta.`
    const parsed = parseKnowledgeMarkdown(md)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({ question: 'Qual o horário?', answer: 'A partir das 19h.', tags: ['horario', 'agenda'] })
    expect(parsed[1].tags).toEqual([])
  })
})
