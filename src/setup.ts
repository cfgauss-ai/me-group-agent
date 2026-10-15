import { writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { stringify } from 'yaml'
import prompts from 'prompts'
import { parseConfig } from './config/schema.js'

export function buildConfigObject(a: {
  name: string
  persona: string
  whatsapp: boolean
  telegram: boolean
  iaEnabled: boolean
  model: string
}): unknown {
  return {
    bot: { name: a.name, persona: a.persona },
    channels: { whatsapp: a.whatsapp, telegram: a.telegram },
    welcome: { enabled: true, message: `Bem-vindo(a), {nome}! 👋`, rules: 'Seja respeitoso(a) e evite spam.' },
    moderation: {
      enabled: true,
      blockedWords: [],
      linkPolicy: { mode: 'off', allowedDomains: [], action: 'warn' },
      flood: { enabled: true, maxMessages: 6, windowSeconds: 10, action: 'warn' },
      wordAction: 'delete',
    },
    ia: { enabled: a.iaEnabled, model: a.model, triggerOnQuestionMark: false, maxKbResults: 3 },
    agenda: [],
    dailySummary: { enabled: false, cron: '0 21 * * *', groups: [] },
  }
}

const MODELS = [
  'anthropic/claude-sonnet-5',
  'anthropic/claude-haiku-4.5',
  'openai/gpt-4o-mini',
  'google/gemini-flash-1.5',
  'deepseek/deepseek-chat',
]

export async function runWizard(promptImpl: typeof prompts = prompts): Promise<void> {
  if (existsSync('./config.yaml')) {
    const { overwrite } = await promptImpl({
      type: 'confirm',
      name: 'overwrite',
      message: 'config.yaml já existe. Sobrescrever?',
      initial: false,
    })
    if (!overwrite) {
      console.log('Cancelado.')
      return
    }
  }
  const a = await promptImpl([
    { type: 'text', name: 'name', message: 'Nome do bot:', initial: 'Mia' },
    {
      type: 'text',
      name: 'persona',
      message: 'Persona (1 linha, vira o system prompt):',
      initial: 'Você é a Mia, assistente simpática do grupo.',
    },
    { type: 'confirm', name: 'whatsapp', message: 'Ligar WhatsApp (QR Code)?', initial: true },
    { type: 'confirm', name: 'telegram', message: 'Ligar Telegram?', initial: false },
    {
      type: (prev: boolean) => (prev ? 'text' : null),
      name: 'telegramToken',
      message: 'Token do BotFather:',
    },
    { type: 'confirm', name: 'iaEnabled', message: 'Ligar respostas com IA (OpenRouter)?', initial: true },
    {
      type: (prev: boolean) => (prev ? 'select' : null),
      name: 'model',
      message: 'Modelo:',
      choices: MODELS.map((m) => ({ title: m, value: m })),
    },
    {
      type: (_prev: unknown, values: { iaEnabled?: boolean }) => (values.iaEnabled ? 'password' : null),
      name: 'openrouterKey',
      message: 'OPENROUTER_API_KEY:',
    },
  ])
  const obj = buildConfigObject({
    name: a.name,
    persona: a.persona,
    whatsapp: !!a.whatsapp,
    telegram: !!a.telegram,
    iaEnabled: !!a.iaEnabled,
    model: a.model ?? MODELS[0],
  })
  try {
    parseConfig(obj)
  } catch {
    console.log('❌ Você precisa habilitar pelo menos um canal (WhatsApp ou Telegram). Rode `npm run setup` de novo.')
    return
  }
  writeFileSync('./config.yaml', stringify(obj), 'utf8')
  let env = ''
  if (a.openrouterKey) env += `OPENROUTER_API_KEY=${a.openrouterKey}\n`
  if (a.telegramToken) env += `TELEGRAM_BOT_TOKEN=${a.telegramToken}\n`
  // Always ensure ./.env exists as a file (not a directory). Docker's bind mount
  // in docker-compose.yml auto-creates ./.env as a directory if it's missing when
  // `docker compose up` runs first; a later appendFileSync here would then crash
  // with EISDIR. Touching the file now (even empty) prevents that footgun.
  if (!existsSync('./.env')) writeFileSync('./.env', '', 'utf8')
  if (env) appendFileSync('./.env', env)
  console.log('✅ config.yaml gravado. Rode `npm start` para iniciar. (WhatsApp mostrará o QR no terminal.)')
}

import { pathToFileURL } from 'node:url'
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runWizard()
}
