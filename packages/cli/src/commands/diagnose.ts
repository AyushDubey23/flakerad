import fs from 'fs'
import path from 'path'
import { diagnoseTest } from '../engine/diagnose.js'
import { openDatabase } from '../history/db.js'
import { DiagnosisResult, FlakeradConfig } from '../types.js'


export interface DiagnoseCommandOptions {
  reruns?: string
  fast?: boolean
  safeMode?: boolean
  timeout?: string
  runner?: string
  json?: boolean
  noUi?: boolean
  watch?: boolean
  cwd?: string
}

export async function diagnoseCommand(
  testPattern: string,
  options: DiagnoseCommandOptions = {}
): Promise<DiagnosisResult> {
  const cwd = options.cwd || process.cwd()

  // Load .flakeradrc.json if present
  let fileConfig: Partial<FlakeradConfig> = {}
  const configPath = path.join(cwd, '.flakeradrc.json')
  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    } catch {
      // ignore
    }
  }

  const isFast = options.fast ?? fileConfig.fast ?? false
  const isSafe = options.safeMode ?? fileConfig.safeMode ?? false
  let reruns = options.reruns
    ? parseInt(options.reruns, 10)
    : fileConfig.reruns || (isSafe ? 3 : isFast ? 4 : 10)

  if (isSafe) {
    reruns = Math.min(reruns, 3)
    if (!options.json) {
      console.warn('[flakerad] WARNING: --safe-mode active. Rerun count capped to 3 to prevent unsafe side-effects.')
    }
  } else if (isFast) {
    reruns = Math.min(reruns, 4)
    if (!options.json) {
      console.warn('[flakerad] NOTICE: --fast mode active (4 reruns/condition). Reduced confidence.')
    }
  }

  // Resolve test file path
  let testPath = path.resolve(cwd, testPattern)
  if (!fs.existsSync(testPath)) {
    // Try relative or as pattern
    testPath = testPattern
  }

  let uiController: {
    onProgress: (evt: { condition: any; runIndex: number; totalRuns: number; passed: boolean }) => void
    onConditionComplete: (summary: any) => void
    finish: (diagnosis: any) => void
  } | null = null
  const useUi = !options.json && !options.noUi && process.stdout.isTTY

  if (useUi) {
    const { createTerminalLiveController } = await import('../ui/TerminalUI.js')
    uiController = createTerminalLiveController(testPattern, reruns, isFast, isSafe)
  }

  const diagnosis = await diagnoseTest(testPattern, testPath, {
    reruns,
    fast: isFast,
    safeMode: isSafe,
    runner: options.runner || fileConfig.runner,
    cwd,
    onProgress: (evt) => {
      if (uiController) {
        uiController.onProgress(evt)
      } else if (!options.json) {
        process.stdout.write(
          `[${evt.condition}] run ${evt.runIndex}/${evt.totalRuns}: ${evt.passed ? 'PASS' : 'FAIL'} (${evt.durationMs}ms)\n`
        )
      }
    },
    onConditionComplete: (summary) => {
      if (uiController) {
        uiController.onConditionComplete(summary)
      } else if (!options.json) {
        console.log(
          `[${summary.condition}] completed: ${summary.passedRuns}/${summary.totalRuns} passed (${Math.round(
            summary.failureRate * 100
          )}% fail rate)`
        )
      }
    }
  })

  if (uiController) {
    uiController.finish(diagnosis)
  }

  // Save to SQLite history
  try {
    const db = openDatabase()
    db.insertRun({
      timestamp: diagnosis.timestamp,
      testPattern: diagnosis.testPattern,
      testPath: diagnosis.testPath,
      attributedCause: diagnosis.attributedCause,
      confidence: diagnosis.confidence,
      baselineFailureRate: diagnosis.baselineFailureRate,
      seedFailureRate: diagnosis.conditionSummaries.seed.failureRate,
      clockFailureRate: diagnosis.conditionSummaries.clock.failureRate,
      orderFailureRate: diagnosis.conditionSummaries.order.failureRate,
      detailsJson: JSON.stringify(diagnosis)
    })
    db.close()
  } catch (err) {
    if (!options.json) {
      console.error(`[flakerad] Warning: Could not write to history database:`, err)
    }
  }

  if (options.json) {
    console.log(JSON.stringify(diagnosis, null, 2))
  } else if (!useUi) {
    console.log('\n================ DIAGNOSTIC REPORT ================')
    console.log(`Test: ${diagnosis.testPattern}`)
    console.log(`Verdict: ${diagnosis.attributedCause.toUpperCase()}`)
    console.log(`Confidence: ${Math.round(diagnosis.confidence * 100)}%`)
    console.log(`Explanation: ${diagnosis.explanation}`)
    console.log('Failure Rates:')
    console.log(`  - Baseline:       ${Math.round(diagnosis.baselineFailureRate * 100)}%`)
    console.log(`  - Fixed Seed:     ${Math.round(diagnosis.conditionSummaries.seed.failureRate * 100)}%`)
    console.log(`  - Frozen Clock:   ${Math.round(diagnosis.conditionSummaries.clock.failureRate * 100)}%`)
    console.log(`  - Isolated Order: ${Math.round(diagnosis.conditionSummaries.order.failureRate * 100)}%`)
    console.log('===================================================\n')
  }

  return diagnosis
}
