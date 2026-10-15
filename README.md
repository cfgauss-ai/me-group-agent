# ME — Group Agent

A self-hosted group bot for WhatsApp and/or Telegram: welcome messages,
moderation (blocked words, link policy, flood control), AI replies grounded
in your own knowledge base, scheduled posts, and a daily summary.

## ⚠️ Risk warning — read before connecting WhatsApp

> **Use a secondary WhatsApp number, never your personal/main number.**
> WhatsApp QR-code login in this project uses **Baileys**, an **unofficial**
> library that reverse-engineers the WhatsApp Web protocol. This **violates
> Meta's Terms of Service**, and **your number can be banned** at any time,
> without notice. For production use within the rules, migrate to the
> official **WhatsApp Cloud API**.
>
> Telegram, via the official Bot API, carries none of this risk.
>
> `npm audit` also reports known vulnerabilities, unrelated to Baileys. The
> production/runtime surface is limited to a moderate `node-cron` → `uuid`
> advisory; the critical/high findings are in dev-only test tooling (vitest,
> vite, esbuild, tinypool) that is never installed in production
> (`npm ci --omit=dev`) and is not part of the running bot.

---

## Quickstart

```bash
git clone <this-repo-url>
cd me-group-agent
npm install
npm run setup   # interactive wizard → writes config.yaml (+ .env if needed)
npm start        # WhatsApp: scan the QR code printed in the terminal
```

That's it for a WhatsApp-only, no-AI setup — it runs with zero API keys.

## Telegram setup (BotFather)

1. Open a chat with [@BotFather](https://t.me/BotFather) on Telegram.
2. `/newbot` → follow the prompts → copy the bot token into `.env` as
   `TELEGRAM_BOT_TOKEN=...` (the setup wizard does this for you if you enable
   Telegram during `npm run setup`).
3. **Critical: `/setprivacy` → select your bot → choose `Disable`.**
   By default Telegram bots only receive messages that `@mention` them or
   start with `/command` — with privacy mode **enabled** (the default), the
   bot never sees ordinary group messages, so moderation and the `?`-trigger
   AI reply silently never fire. You must disable privacy mode.
4. Add the bot to your group, then **promote it to admin** (see below).

## WhatsApp setup (QR login)

Run `npm start` (after `npm run setup`). On first run, a QR code is printed
in the terminal — scan it with WhatsApp on your phone (**Linked Devices →
Link a Device**), using the secondary number from the warning above.

The authenticated session is stored on disk at `data/wa-auth/` so you don't
have to re-scan on every restart. This directory contains your login
credentials — it is already excluded by `.gitignore`; never commit it or
share it.

## Group admin requirement

**On both channels, the bot must be a group admin** to delete messages or
remove members. Without admin rights, `moderation` actions configured as
`delete` or `remove` fail silently (the bot can still `warn`, since that's
just sending a text message). Promote the bot to admin in the group's
member list right after adding it.

## Configuration reference

Copy `config.example.yaml` to `config.yaml` (or let `npm run setup` generate
it). All fields below mirror `src/config/schema.ts`.

| Field | Type | Default | Notes |
|---|---|---|---|
| `bot.name` | string | — | required, display name |
| `bot.persona` | string | — | required, 1-line system prompt for AI replies |
| `channels.whatsapp` | bool | — | required; at least one channel must be `true` |
| `channels.telegram` | bool | — | required |
| `welcome.enabled` | bool | `false` | send a message when a member joins |
| `welcome.message` | string | `Bem-vindo(a), {nome}!` | `{nome}` → new member's name |
| `welcome.rules` | string | `""` | appended to the welcome message |
| `moderation.enabled` | bool | `false` | master switch for moderation features |
| `moderation.blockedWords` | string[] | `[]` | messages containing any of these trigger `wordAction` |
| `moderation.wordAction` | `warn\|delete\|remove` | `delete` | action for a blocked-word hit |
| `moderation.linkPolicy.mode` | `off\|allowlist` | `off` | `allowlist` blocks any link not in `allowedDomains` |
| `moderation.linkPolicy.allowedDomains` | string[] | `[]` | used only when `mode: allowlist` |
| `moderation.linkPolicy.action` | `warn\|delete\|remove` | `warn` | action for a disallowed link |
| `moderation.flood.enabled` | bool | `false` | rate-limit messages per member |
| `moderation.flood.maxMessages` | number | `5` | the Nth message within `windowSeconds` triggers `action` (a burst is actioned on the maxMessages-th message) |
| `moderation.flood.windowSeconds` | number | `10` | window size, in seconds |
| `moderation.flood.action` | `warn\|delete\|remove` | `warn` | action when the flood limit is hit |
| `ia.enabled` | bool | `false` | master switch for AI replies |
| `ia.model` | string | `anthropic/claude-sonnet-5` | OpenRouter model id (requires `OPENROUTER_API_KEY` in `.env`) |
| `ia.triggerOnQuestionMark` | bool | `false` | also reply to any message ending in `?`, not just @mentions |
| `ia.maxKbResults` | number | `3` | max knowledge-base entries injected per reply |
| `ia.cooldownSeconds` | number | `10` | minimum seconds between AI replies in the same group (cost guard) |
| `agenda[].cron` | string | — | required, standard cron expression |
| `agenda[].text` | string | — | required, message text to post |
| `agenda[].channel` | `whatsapp\|telegram` | — | **required if both channels are enabled** (see below) |
| `agenda[].groups` | string[] | `[]` | group ids to post to |
| `dailySummary.enabled` | bool | `false` | post an end-of-day recap |
| `dailySummary.cron` | string | `0 21 * * *` | when to post |
| `dailySummary.channel` | `whatsapp\|telegram` | — | **required if both channels are enabled** |
| `dailySummary.groups` | string[] | `[]` | group ids to post the summary to |

**`dailySummary` requires `ia.enabled: true`** — it uses the AI model to summarize the day's
messages; with `ia.enabled: false` it is skipped at runtime with a logged warning.

**Both channels enabled?** Every `agenda[]` entry and `dailySummary` must set
`channel: whatsapp` or `channel: telegram` — with only one group id space,
the scheduler has no way to know which channel to post to, so an entry
missing `channel` in a dual-channel setup is **skipped at runtime with a
logged warning**, not silently guessed.

## Knowledge base

Put one or more `.md` files in `knowledge/`. Each file is a list of
question/answer blocks:

```markdown
## What time does the weekly meetup happen?

Every Thursday at 7pm.
tags: meetup, schedule
```

- `## <question>` starts a new entry.
- Everything until the next `##` (or a `tags:` line) is the answer.
- `tags: a, b, c` is optional and improves matching.

After editing any file in `knowledge/`, run:

```bash
npm run kb:sync
```

See `knowledge/exemplo.md` for a fully worked, fictional example. AI replies
with `ia.enabled: true` search this knowledge base for the top
`ia.maxKbResults` matches and include them as grounding context.

## Manual smoke test

Automated tests cover the pure logic; the following still needs a live
check per channel before you trust it in a real group:

1. **Startup** — `npm start` connects with no errors; for WhatsApp, the QR
   code renders and scanning it logs a successful connection.
2. **Welcome** — add a throwaway account to the group and confirm the
   welcome message posts (if `welcome.enabled: true`).
3. **Moderation** — post a message containing a `blockedWords` entry and
   confirm the configured `wordAction` happens (and that `delete`/`remove`
   only work once the bot is admin — see above).
4. **AI reply** — with `ia.enabled: true`, @mention the bot (or end a message
   with `?` if `triggerOnQuestionMark: true`) and confirm a reply arrives,
   grounded in `knowledge/` content when relevant.
5. **Scheduled post** — temporarily set an `agenda[]` cron to a few minutes
   in the future and confirm it posts to the right group/channel.
6. **Restart persistence** — stop and restart the process; for WhatsApp,
   confirm it reconnects without a new QR scan (session in `data/wa-auth/`).

## Docker (optional)

Running on the host with `npm start` is the simplest path. If you'd rather
containerize it:

```bash
cp .env.example .env
npm run setup   # creates config.yaml
docker compose up --build
```

Create `.env` first — `docker-compose.yml` bind-mounts `./.env`, and if it
doesn't exist yet Docker auto-creates it as a **directory**, which breaks any
later `npm run setup` run that tries to write secrets into it.

Create `config.yaml` first too, the same way (`npm run setup`, or by hand) —
`docker-compose.yml` also bind-mounts `./config.yaml`, and if it doesn't exist
yet Docker auto-creates it as a **directory**, which crashes the container on
startup.

This mounts `./data`, `./config.yaml`, and `./.env` into the container so
your session, config, and secrets persist across rebuilds. The base image is
`node:20-bookworm` (not `-slim`) because `better-sqlite3` needs a
glibc-compatible prebuilt binary.

## License

MIT — see [LICENSE](LICENSE).

---

## Uso em português

### Início rápido

```bash
git clone <url-deste-repositorio>
cd me-group-agent
npm install
npm run setup   # assistente interativo → gera config.yaml (e .env se precisar)
npm start        # WhatsApp: escaneie o QR Code impresso no terminal
```

Isso já basta para um setup só de WhatsApp, sem IA — roda sem nenhuma chave
de API.

**Aviso de risco:** a conexão por QR Code usa o Baileys, biblioteca
não-oficial. Isso **viola os Termos de Serviço da Meta** e **seu número pode
ser banido**. Use sempre um número secundário, nunca o seu WhatsApp
principal.

Para Telegram, crie o bot no [@BotFather](https://t.me/BotFather), copie o
token para `TELEGRAM_BOT_TOKEN` no `.env`, e **lembre-se de rodar
`/setprivacy` → `Disable`** — sem isso o bot não vê mensagens normais do
grupo. Em ambos os canais, promova o bot a **admin** do grupo para que
`delete`/`remove` funcionem.

Edite `config.yaml` (veja a tabela de referência acima, em inglês — os nomes
dos campos são os mesmos) e os arquivos em `knowledge/*.md` para a base de
conhecimento; depois rode `npm run kb:sync`.
