export type FlakeCondition = 'baseline' | 'seed' | 'clock' | 'order'

export type FlakeCause =
  | 'non-deterministic input'
  | 'timing/race condition'
  | 'test-order/shared-state dependency'
  | 'environment-dependent, flag for manual review'
  | 'no-flakiness-observed'

export interface TestRunResult {
  runIndex: number
  condition: FlakeCondition
  passed: boolean
  durationMs: number
  output: string
  error?: string
}

export interface ConditionSummary {
  condition: FlakeCondition
  label: string
  description: string
  totalRuns: number
  passedRuns: number
  failedRuns: number
  failureRate: number
  runs: TestRunResult[]
}

export interface DiagnosisResult {
  testPattern: string
  testPath: string
  testName?: string
  totalReruns: number
  baselineFailureRate: number
  conditionSummaries: Record<FlakeCondition, ConditionSummary>
  attributedCause: FlakeCause
  confidence: number
  explanation: string
  deltas: Record<FlakeCondition, number>
  isFastMode: boolean
  isSafeMode: boolean
  timestamp: string
}

export interface FlakeradConfig {
  runner: 'jest' | 'vitest' | 'mocha' | 'custom'
  reruns: number
  timeoutMs: number
  fast: boolean
  safeMode: boolean
  command?: string
  targetTestPattern?: string
}

export interface HistoryEntry {
  id: string
  timestamp: string
  testPattern: string
  testPath: string
  attributedCause: string
  confidence: number
  baselineFailureRate: number
  seedFailureRate: number
  clockFailureRate: number
  orderFailureRate: number
  detailsJson: string
}
