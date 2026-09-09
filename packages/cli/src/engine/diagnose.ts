import {
  ConditionSummary,
  DiagnosisResult,
  FlakeCause,
  FlakeCondition,
  TestRunResult
} from '../types.js'
import { resolveRunner, RunnerAdapter } from '../adapters/runner-adapter.js'

export interface DiagnoseOptions {
  reruns?: number
  fast?: boolean
  safeMode?: boolean
  timeoutMs?: number
  runner?: string
  cwd?: string
  testName?: string
  onProgress?: (event: {
    condition: FlakeCondition
    runIndex: number
    totalRuns: number
    passed: boolean
    durationMs: number
  }) => void
  onConditionComplete?: (summary: ConditionSummary) => void
}

const CONDITION_METADATA: Record<FlakeCondition, { label: string; description: string }> = {
  baseline: { label: 'baseline', description: 'the honest first run' },
  seed: { label: 'fixed seed', description: 'same random inputs' },
  clock: { label: 'frozen clock', description: 'same time, every run' },
  order: { label: 'isolated order', description: 'one test, no neighbors' }
}

export async function runCondition(
  runner: RunnerAdapter,
  condition: FlakeCondition,
  testPath: string,
  testPattern: string,
  totalRuns: number,
  options: DiagnoseOptions
): Promise<ConditionSummary> {
  const runs: TestRunResult[] = []
  let passedCount = 0

  for (let i = 1; i <= totalRuns; i++) {
    const result = await runner.runTest({
      testPath,
      testPattern,
      testName: options.testName,
      condition,
      runIndex: i,
      timeoutMs: options.timeoutMs,
      cwd: options.cwd
    })

    runs.push(result)
    if (result.passed) passedCount++

    if (options.onProgress) {
      options.onProgress({
        condition,
        runIndex: i,
        totalRuns,
        passed: result.passed,
        durationMs: result.durationMs
      })
    }
  }

  const failedCount = totalRuns - passedCount
  const failureRate = totalRuns > 0 ? failedCount / totalRuns : 0

  const summary: ConditionSummary = {
    condition,
    label: CONDITION_METADATA[condition].label,
    description: CONDITION_METADATA[condition].description,
    totalRuns,
    passedRuns: passedCount,
    failedRuns: failedCount,
    failureRate,
    runs
  }

  if (options.onConditionComplete) {
    options.onConditionComplete(summary)
  }

  return summary
}

export async function diagnoseTest(
  testPattern: string,
  testPath: string,
  options: DiagnoseOptions = {}
): Promise<DiagnosisResult> {
  const cwd = options.cwd || process.cwd()
  let reruns = options.reruns || 8
  const isSafeMode = Boolean(options.safeMode)
  const isFastMode = Boolean(options.fast)

  // Safe mode constraint
  if (isSafeMode) {
    reruns = Math.min(reruns, 3)
  } else if (isFastMode) {
    reruns = Math.min(reruns, 4)
  }

  const runner = await resolveRunner(cwd, options.runner)

  // 1. Run Baseline
  const baselineSummary = await runCondition(
    runner,
    'baseline',
    testPath,
    testPattern,
    reruns,
    options
  )

  const baselineRate = baselineSummary.failureRate

  // If test never fails on baseline, report no flakiness observed
  if (baselineRate === 0) {
    const emptySummary = (c: FlakeCondition): ConditionSummary => ({
      condition: c,
      label: CONDITION_METADATA[c].label,
      description: CONDITION_METADATA[c].description,
      totalRuns: 0,
      passedRuns: 0,
      failedRuns: 0,
      failureRate: 0,
      runs: []
    })

    return {
      testPattern,
      testPath,
      testName: options.testName,
      totalReruns: reruns,
      baselineFailureRate: 0,
      conditionSummaries: {
        baseline: baselineSummary,
        seed: emptySummary('seed'),
        clock: emptySummary('clock'),
        order: emptySummary('order')
      },
      attributedCause: 'no-flakiness-observed',
      confidence: 1.0,
      explanation: `Test passed 100% of ${reruns} baseline runs. No intermittent failure was observed.`,
      deltas: { baseline: 0, seed: 0, clock: 0, order: 0 },
      isFastMode,
      isSafeMode,
      timestamp: new Date().toISOString()
    }
  }

  // 2. Run Controlled Conditions: Fixed Seed, Frozen Clock, Isolated Order
  const seedSummary = await runCondition(runner, 'seed', testPath, testPattern, reruns, options)
  const clockSummary = await runCondition(runner, 'clock', testPath, testPattern, reruns, options)
  const orderSummary = await runCondition(runner, 'order', testPath, testPattern, reruns, options)

  const conditionSummaries: Record<FlakeCondition, ConditionSummary> = {
    baseline: baselineSummary,
    seed: seedSummary,
    clock: clockSummary,
    order: orderSummary
  }

  // 3. Compute Failure Deltas
  // Delta represents how much the controlled condition reduced the failure rate:
  // (F_base - F_controlled) / F_base
  const delta = (rate: number) => (baselineRate > 0 ? (baselineRate - rate) / baselineRate : 0)

  const deltas: Record<FlakeCondition, number> = {
    baseline: 0,
    seed: delta(seedSummary.failureRate),
    clock: delta(clockSummary.failureRate),
    order: delta(orderSummary.failureRate)
  }

  // 4. Causal Inference
  // Condition is deemed to resolve if failure rate drops to <= 0.05 and delta >= 0.70
  const resolves = (c: FlakeCondition) =>
    conditionSummaries[c].failureRate <= 0.05 && deltas[c] >= 0.7

  let attributedCause: FlakeCause = 'environment-dependent, flag for manual review'
  let explanation = ''
  let confidence = isFastMode ? 0.75 : isSafeMode ? 0.7 : 0.95

  const seedResolves = resolves('seed')
  const clockResolves = resolves('clock')
  const orderResolves = resolves('order')

  if (seedResolves && !clockResolves && !orderResolves) {
    attributedCause = 'non-deterministic input'
    explanation = `A fixed seed collapsed the failure rate from ${Math.round(
      baselineRate * 100
    )}% to ${Math.round(
      seedSummary.failureRate * 100
    )}%. The flakiness is caused by non-deterministic random inputs.`
  } else if (clockResolves && !seedResolves && !orderResolves) {
    attributedCause = 'timing/race condition'
    explanation = `Freezing the clock eliminated failures (${Math.round(
      baselineRate * 100
    )}% -> ${Math.round(
      clockSummary.failureRate * 100
    )}%). The flakiness is caused by timing sensitivity or asynchronous race conditions.`
  } else if (orderResolves && !seedResolves && !clockResolves) {
    attributedCause = 'test-order/shared-state dependency'
    explanation = `Isolated order execution eliminated failures (${Math.round(
      baselineRate * 100
    )}% -> ${Math.round(
      orderSummary.failureRate * 100
    )}%). The flakiness is caused by test-order execution or shared module state.`
  } else if (seedResolves || clockResolves || orderResolves) {
    // Multiple conditions showed improvement: choose the strongest delta
    const candidates: Array<{ cond: FlakeCondition; cause: FlakeCause; d: number }> = [
      { cond: 'seed' as FlakeCondition, cause: 'non-deterministic input' as FlakeCause, d: deltas.seed },
      { cond: 'clock' as FlakeCondition, cause: 'timing/race condition' as FlakeCause, d: deltas.clock },
      { cond: 'order' as FlakeCondition, cause: 'test-order/shared-state dependency' as FlakeCause, d: deltas.order }
    ].sort((a, b) => b.d - a.d)

    attributedCause = candidates[0].cause
    explanation = `Primary resolution observed under ${candidates[0].cond} (delta: ${Math.round(
      candidates[0].d * 100
    )}%). Stabilized against baseline ${Math.round(baselineRate * 100)}% failure rate.`
  } else {
    // None of the 4 controls resolved the failure
    attributedCause = 'environment-dependent, flag for manual review'
    confidence = isFastMode ? 0.7 : 0.9
    explanation = `None of the four controlled conditions (fixed seed, frozen clock, isolated order) stabilized the test. Baseline failure rate was ${Math.round(
      baselineRate * 100
    )}% and failures persisted across all controls. The failure is environment-dependent (external network, host state, or hardware). Flagged for manual review.`
  }

  return {
    testPattern,
    testPath,
    testName: options.testName,
    totalReruns: reruns,
    baselineFailureRate: baselineRate,
    conditionSummaries,
    attributedCause,
    confidence,
    explanation,
    deltas,
    isFastMode,
    isSafeMode,
    timestamp: new Date().toISOString()
  }
}
