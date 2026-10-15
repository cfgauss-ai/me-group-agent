import 'dotenv/config'
import { loadConfig } from './config/load.js'
import { openDb, migrate } from './db/schema.js'
import { Repo } from './db/repo.js'
import { syncKnowledge } from './knowledge/sync.js'
import { attach } from './engine/pipeline.js'
import { startScheduler } from './features/scheduler.js'
import { TelegramChannel } from './channels/telegram.js'
import { WhatsAppChannel } from './channels/whatsapp.js'
import type { Channel } from './channels/channel.js'

process.on('unhandledRejection', (err) => { console.error('[ME] unhandledRejection:', err) })

async function main(): Promise<void> {
  const config = loadConfig()
  const db = openDb(); migrate(db)
  const repo = new Repo(db)
  const n = syncKnowledge(repo)
  console.log(`[ME] ${n} knowledge entries loaded.`)

  const apiKey = process.env.OPENROUTER_API_KEY ?? ''
  if (config.ia.enabled && !apiKey) throw new Error('ia.enabled=true but OPENROUTER_API_KEY is missing in .env')

  const channels: Channel[] = []
  if (config.channels.telegram) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) throw new Error('channels.telegram=true but TELEGRAM_BOT_TOKEN is missing in .env')
    channels.push(new TelegramChannel(token))
  }
  if (config.channels.whatsapp) channels.push(new WhatsAppChannel({ botName: config.bot.name }))

  for (const ch of channels) {
    attach(ch, { config, repo, apiKey })
    await ch.start()
    console.log(`[ME] channel ${ch.id} started.`)
  }
  // Scheduler runs ONCE over all channels; it routes each agenda/summary item to its channel.
  startScheduler({ config, repo, channels, apiKey })
  console.log('[ME] running. Press Ctrl+C to stop.')
}

main().catch((err) => { console.error('[ME] fatal:', err); process.exit(1) })
