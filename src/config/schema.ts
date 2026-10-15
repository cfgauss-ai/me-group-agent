import { z } from 'zod'

const modAction = z.enum(['warn', 'delete', 'remove'])

export const configSchema = z.object({
  bot: z.object({ name: z.string().min(1), persona: z.string().min(1) }),
  channels: z.object({ whatsapp: z.boolean(), telegram: z.boolean() })
    .refine((c) => c.whatsapp || c.telegram, 'enable at least one channel'),
  welcome: z.object({
    enabled: z.boolean().default(false),
    message: z.string().default('Bem-vindo(a), {nome}!'),
    rules: z.string().default(''),
  }).default({}),
  moderation: z.object({
    enabled: z.boolean().default(false),
    blockedWords: z.array(z.string()).default([]),
    linkPolicy: z.object({
      mode: z.enum(['off', 'allowlist']).default('off'),
      allowedDomains: z.array(z.string()).default([]),
      action: modAction.default('warn'),
    }).default({}),
    flood: z.object({
      enabled: z.boolean().default(false),
      maxMessages: z.number().int().positive().default(5),
      windowSeconds: z.number().int().positive().default(10),
      action: modAction.default('warn'),
    }).default({}),
    wordAction: modAction.default('delete'),
  }).default({}),
  ia: z.object({
    enabled: z.boolean().default(false),
    model: z.string().default('anthropic/claude-sonnet-5'),
    triggerOnQuestionMark: z.boolean().default(false),
    maxKbResults: z.number().int().positive().default(3),
    cooldownSeconds: z.number().int().nonnegative().default(10),  // min seconds between AI replies per group (cost guard)
  }).default({}),
  agenda: z.array(z.object({
    cron: z.string().min(1), text: z.string().min(1),
    channel: z.enum(['whatsapp', 'telegram']).optional(),
    groups: z.array(z.string()).default([]),
  })).default([]),
  dailySummary: z.object({
    enabled: z.boolean().default(false),
    cron: z.string().default('0 21 * * *'),
    channel: z.enum(['whatsapp', 'telegram']).optional(),
    groups: z.array(z.string()).default([]),
  }).default({}),
})

export type Config = z.infer<typeof configSchema>

export function parseConfig(raw: unknown): Config {
  return configSchema.parse(raw)
}
