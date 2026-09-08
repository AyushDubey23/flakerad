import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { execa } from 'execa'
import { FlakeCondition, TestRunResult } from '../types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface RunOptions {
  testPattern: string
  testPath: string
  testName?: string
  condition: FlakeCondition
  runIndex: number
  timeoutMs?: number
  cwd?: string
}

export interface RunnerAdapter {
  name: string
  detect(cwd: string): Promise<boolean>
  runTest(options: RunOptions): Promise<TestRunResult>
}

function getInjectionPath(filename: string): string {
  // Check if compiled in dist or in src
  const distPath = path.resolve(__dirname, '..', 'injections', filename)
  if (fs.existsSync(distPath)) return distPath
  const srcPath = path.resolve(__dirname, '..', '..', 'src', 'injections', filename)
  if (fs.existsSync(srcPath)) return srcPath
  return distPath
}

export class JestAdapter implements RunnerAdapter {
  name = 'jest'

  async detect(cwd: string): Promise<boolean> {
    const pkgPath = path.join(cwd, 'package.json')
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        if (pkg.devDependencies?.jest || pkg.dependencies?.jest) return true
      } catch {
        // ignore
      }
    }
    return (
      fs.existsSync(path.join(cwd, 'jest.config.js')) ||
      fs.existsSync(path.join(cwd, 'jest.config.ts')) ||
      fs.existsSync(path.join(cwd, 'jest.config.mjs')) ||
      fs.existsSync(path.join(cwd, 'jest.config.cjs'))
    )
  }

  async runTest(options: RunOptions): Promise<TestRunResult> {
    const cwd = options.cwd || process.cwd()
    const startTime = Date.now()

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      FLAKERAD_CONDITION: options.condition,
      FLAKERAD_RUN_INDEX: String(options.runIndex)
    }

    const nodeArgs: string[] = []
    const jestArgs: string[] = [
      '--runInBand',
      '--no-cache',
      '--detectOpenHandles',
      '--forceExit'
    ]

    if (options.condition === 'seed') {
      const seedScript = getInjectionPath('inject-seed.cjs')
      nodeArgs.push(`--require=${seedScript}`)
      env.FLAKERAD_SEED = '133742'
    } else if (options.condition === 'clock') {
      const clockScript = getInjectionPath('inject-clock.cjs')
      nodeArgs.push(`--require=${clockScript}`)
      env.FLAKERAD_EPOCH = '1767225600000'
    } else if (options.condition === 'order') {
      // In isolated order: run strictly target test alone with no sibling tests
      env.FLAKERAD_ISOLATED = '1'
      jestArgs.push('--runInBand')
      if (options.testName) {
        jestArgs.push('-t', options.testName)
      }
    }

    if (nodeArgs.length > 0) {
      env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} ${nodeArgs.join(' ')}`.trim()
    }

    const testTarget = options.testPath || options.testPattern
    jestArgs.push(testTarget)

    try {
      const proc = await execa('npx', ['jest', ...jestArgs], {
        cwd,
        env,
        timeout: options.timeoutMs || 15000,
        reject: false
      })

      const durationMs = Date.now() - startTime
      const passed = proc.exitCode === 0

      return {
        runIndex: options.runIndex,
        condition: options.condition,
        passed,
        durationMs,
        output: (proc.stdout || '') + '\n' + (proc.stderr || ''),
        error: passed ? undefined : proc.stderr || 'Test execution failed'
      }
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime
      const errorMsg = err instanceof Error ? err.message : String(err)
      return {
        runIndex: options.runIndex,
        condition: options.condition,
        passed: false,
        durationMs,
        output: '',
        error: errorMsg
      }
    }
  }
}

export class DirectNodeAdapter implements RunnerAdapter {
  name = 'node'

  async detect(): Promise<boolean> {
    return true // Default fallback
  }

  async runTest(options: RunOptions): Promise<TestRunResult> {
    const cwd = options.cwd || process.cwd()
    const startTime = Date.now()

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      FLAKERAD_CONDITION: options.condition,
      FLAKERAD_RUN_INDEX: String(options.runIndex)
    }

    const nodeArgs: string[] = []

    if (options.condition === 'seed') {
      const seedScript = getInjectionPath('inject-seed.cjs')
      nodeArgs.push(`--require=${seedScript}`)
      env.FLAKERAD_SEED = '133742'
    } else if (options.condition === 'clock') {
      const clockScript = getInjectionPath('inject-clock.cjs')
      nodeArgs.push(`--require=${clockScript}`)
      env.FLAKERAD_EPOCH = '1767225600000'
    } else if (options.condition === 'order') {
      env.FLAKERAD_ISOLATED = '1'
    }

    const testTarget = options.testPath || options.testPattern

    try {
      const proc = await execa('node', [...nodeArgs, testTarget], {
        cwd,
        env,
        timeout: options.timeoutMs || 15000,
        reject: false
      })

      const durationMs = Date.now() - startTime
      const passed = proc.exitCode === 0

      return {
        runIndex: options.runIndex,
        condition: options.condition,
        passed,
        durationMs,
        output: (proc.stdout || '') + '\n' + (proc.stderr || ''),
        error: passed ? undefined : (proc.stderr || proc.stdout || 'Test failed')
      }
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime
      const errorMsg = err instanceof Error ? err.message : String(err)
      return {
        runIndex: options.runIndex,
        condition: options.condition,
        passed: false,
        durationMs,
        output: '',
        error: errorMsg
      }
    }
  }
}

export async function resolveRunner(cwd: string, explicitRunner?: string): Promise<RunnerAdapter> {
  if (explicitRunner === 'jest') return new JestAdapter()
  if (explicitRunner === 'node') return new DirectNodeAdapter()

  const jest = new JestAdapter()
  if (await jest.detect(cwd)) {
    return jest
  }
  return new DirectNodeAdapter()
}
