import fs from 'fs'
import path from 'path'
import { JestAdapter } from '../adapters/runner-adapter.js'
import { FlakeradConfig } from '../types.js'

export async function initCommand(options: { force?: boolean; cwd?: string } = {}) {
  const cwd = options.cwd || process.cwd()
  const configPath = path.join(cwd, '.flakeradrc.json')

  if (fs.existsSync(configPath) && !options.force) {
    console.log(`[flakerad] Configuration file already exists at ${configPath}`)
    console.log(`Use --force to overwrite.`)
    return
  }

  const jest = new JestAdapter()
  let runner: 'jest' | 'custom' = 'custom'

  if (await jest.detect(cwd)) {
    runner = 'jest'
  }

  const config: FlakeradConfig = {
    runner,
    reruns: 10,
    timeoutMs: 15000,
    fast: false,
    safeMode: false
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8')

  console.log(`[flakerad] Created .flakeradrc.json`)
  console.log(`- Detected test runner: ${runner}`)
  console.log(`- Default reruns: ${config.reruns}`)
  console.log(`- Created by Ayush Dubey`)
}
