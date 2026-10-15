import { describe, it, expect } from 'vitest'
import { loadConfig } from '../src/config/load.js'

describe('loadConfig', () => {
  it('throws the friendly setup error when config.yaml is missing', () => {
    expect(() => loadConfig('./does-not-exist.yaml')).toThrow(
      'config.yaml not found. Run `npm run setup` first to create it.',
    )
  })
})
