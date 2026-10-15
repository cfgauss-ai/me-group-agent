import { readFileSync, statSync } from 'node:fs'
import { parse } from 'yaml'
import { parseConfig, type Config } from './schema.js'

const NOT_FOUND_ERROR = 'config.yaml not found. Run `npm run setup` first to create it.'

export function loadConfig(path = './config.yaml'): Config {
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) throw new Error(NOT_FOUND_ERROR)
  const raw = parse(readFileSync(path, 'utf8'))
  return parseConfig(raw)
}
