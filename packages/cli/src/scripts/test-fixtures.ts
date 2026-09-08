/**
 * Integration test suite for flakerad fixture diagnosis
 * Created by Ayush Dubey
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { diagnoseTest } from '../engine/diagnose.js'
import { FlakeCause } from '../types.js'

import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function findRepoRoot(dir: string): string {
  let cur = dir
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'pnpm-workspace.yaml'))) {
      return cur
    }
    cur = path.dirname(cur)
  }
  return process.cwd()
}

const repoRoot = findRepoRoot(__dirname)

interface TestCase {
  name: string
  file: string
  expectedCause: FlakeCause
}

const testCases: TestCase[] = [
  {
    name: 'Random Input Flake',
    file: 'fixtures/random-input.test.js',
    expectedCause: 'non-deterministic input'
  },
  {
    name: 'Race Condition Flake',
    file: 'fixtures/race-condition.test.js',
    expectedCause: 'timing/race condition'
  },
  {
    name: 'Shared State / Order Dependency Flake',
    file: 'fixtures/shared-state-order.test.js',
    expectedCause: 'test-order/shared-state dependency'
  },
  {
    name: 'Environment Flake',
    file: 'fixtures/environment-flaky.test.js',
    expectedCause: 'environment-dependent, flag for manual review'
  }
]

async function runFixtureTests() {
  console.log('\n============================================================')
  console.log('FLAKERAD INTEGRATION SUITE — DIAGNOSTIC VERIFICATION')
  console.log('Created by Ayush Dubey')
  console.log('============================================================\n')

  let passedAll = true

  for (const tc of testCases) {
    const fullPath = path.resolve(repoRoot, tc.file)
    console.log(`[TESTING] ${tc.name} (${tc.file})...`)

    const diagnosis = await diagnoseTest(tc.file, fullPath, {
      reruns: 10,
      cwd: repoRoot,
      runner: 'node'
    })

    const matched = diagnosis.attributedCause === tc.expectedCause

    console.log(`  - Baseline fail rate: ${Math.round(diagnosis.baselineFailureRate * 100)}%`)
    console.log(`  - Fixed Seed rate:    ${Math.round(diagnosis.conditionSummaries.seed.failureRate * 100)}%`)
    console.log(`  - Frozen Clock rate:  ${Math.round(diagnosis.conditionSummaries.clock.failureRate * 100)}%`)
    console.log(`  - Isolated Order rate:${Math.round(diagnosis.conditionSummaries.order.failureRate * 100)}%`)
    console.log(`  - Diagnosed Cause:    "${diagnosis.attributedCause}"`)
    console.log(`  - Expected Cause:     "${tc.expectedCause}"`)

    if (matched) {
      console.log(`  ✔ PASS: Correct causal attribution (Confidence: ${Math.round(diagnosis.confidence * 100)}%)\n`)
    } else {
      console.log(`  ✖ FAIL: Expected "${tc.expectedCause}", got "${diagnosis.attributedCause}"\n`)
      passedAll = false
    }
  }

  if (!passedAll) {
    console.error('Integration suite FAILED: One or more fixtures were diagnosed incorrectly.')
    process.exit(1)
  }

  console.log('============================================================')
  console.log('✔ ALL 4 FLAKE CATEGORIES CORRECTLY DIAGNOSED WITH 100% ACCURACY')
  console.log('============================================================\n')
}

runFixtureTests().catch((err) => {
  console.error('Fatal error running fixture suite:', err)
  process.exit(1)
})
