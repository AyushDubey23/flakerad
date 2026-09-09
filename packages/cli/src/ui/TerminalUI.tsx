import React from 'react'

// React 19 compatibility polyfill for react-reconciler (used by ink)
const anyReact = React as unknown as {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: unknown
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: unknown
}
if (anyReact && !anyReact.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  anyReact.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED =
    anyReact.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
}

import { Box, Text, render } from 'ink'
import Spinner from 'ink-spinner'
import { ConditionSummary, DiagnosisResult, FlakeCondition } from '../types.js'

export interface TerminalUIProps {
  testPattern: string
  reruns: number
  isFastMode?: boolean
  isSafeMode?: boolean
  activeCondition?: FlakeCondition
  progress: Record<FlakeCondition, { current: number; total: number; passed: number; failed: number }>
  completedConditions: FlakeCondition[]
  summaries: Partial<Record<FlakeCondition, ConditionSummary>>
  diagnosis?: DiagnosisResult
  isDone?: boolean
}

const CONDITION_TITLES: Record<FlakeCondition, string> = {
  baseline: 'run 1 / baseline',
  seed: 'run 2 / fixed seed',
  clock: 'run 3 / frozen clock',
  order: 'run 4 / isolated order'
}

export const TerminalUI: React.FC<TerminalUIProps> = ({
  testPattern,
  reruns,
  isFastMode,
  isSafeMode,
  activeCondition,
  progress,
  diagnosis,
  isDone
}) => {
  const conditions: FlakeCondition[] = ['baseline', 'seed', 'clock', 'order']

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} flexDirection="column">
        <Box>
          <Text bold color="cyan">
            flakerad
          </Text>
          <Text color="gray"> — controlled diagnostic instrument</Text>
        </Box>
        <Box>
          <Text color="gray">target: </Text>
          <Text color="yellow" bold>
            {testPattern}
          </Text>
          <Text color="gray"> | reruns: </Text>
          <Text color="white">{reruns}</Text>
          {isFastMode && (
            <Text color="yellow"> [fast mode: reduced confidence]</Text>
          )}
          {isSafeMode && (
            <Text color="red"> [safe mode: reruns capped]</Text>
          )}
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {conditions.map((cond) => {
          const p = progress[cond]
          const isActive = activeCondition === cond && !isDone
          const isFinished = p.current === p.total && p.total > 0

          let statusIcon = '○'
          let statusColor = 'gray'

          if (isActive) {
            statusIcon = '●'
            statusColor = 'yellow'
          } else if (isFinished) {
            statusIcon = p.failed === 0 ? '✔' : '✖'
            statusColor = p.failed === 0 ? 'green' : 'red'
          }

          const pctPassed = p.current > 0 ? Math.round((p.passed / p.current) * 100) : 0
          const barLength = 16
          const filled = Math.round((p.current / (p.total || 1)) * barLength)
          const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barLength - filled))

          return (
            <Box key={cond} marginY={0}>
              <Box width={26}>
                <Text color={statusColor}>{statusIcon} </Text>
                <Text bold={isActive} color={isActive ? 'white' : 'gray'}>
                  {CONDITION_TITLES[cond]}
                </Text>
              </Box>
              <Box width={20}>
                <Text color={isActive ? 'cyan' : 'gray'}>[{bar}] </Text>
              </Box>
              <Box width={14}>
                <Text color="gray">
                  {p.passed}/{p.current} pass
                </Text>
              </Box>
              <Box width={12}>
                <Text color={pctPassed === 100 ? 'green' : p.failed > 0 ? 'yellow' : 'gray'}>
                  {pctPassed}% rate
                </Text>
              </Box>
              {isActive && (
                <Box marginLeft={1}>
                  <Text color="yellow">
                    <Spinner type="dots" /> running
                  </Text>
                </Box>
              )}
            </Box>
          )
        })}
      </Box>

      {isDone && diagnosis && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={
            diagnosis.attributedCause === 'environment-dependent, flag for manual review'
              ? 'yellow'
              : 'green'
          }
          paddingX={2}
          paddingY={1}
          marginTop={1}
        >
          <Box marginBottom={1}>
            <Text bold color="white">
              DIAGNOSTIC VERDICT:{' '}
            </Text>
            <Text
              bold
              color={
                diagnosis.attributedCause === 'environment-dependent, flag for manual review'
                  ? 'yellow'
                  : 'green'
              }
            >
              {diagnosis.attributedCause.toUpperCase()}
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray">Confidence: </Text>
            <Text color="cyan" bold>
              {Math.round(diagnosis.confidence * 100)}%
            </Text>
            <Text color="gray"> | Baseline failure rate: </Text>
            <Text color="red" bold>
              {Math.round(diagnosis.baselineFailureRate * 100)}%
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="white">{diagnosis.explanation}</Text>
          </Box>
          {diagnosis.remediation && (
            <Box marginBottom={1}>
              <Text color="cyan" bold>
                Remediation:{' '}
              </Text>
              <Text color="gray">{diagnosis.remediation}</Text>
            </Box>
          )}
          <Box flexDirection="column" marginTop={1}>
            <Text color="gray" bold>
              Failure Rates by Condition:
            </Text>
            {conditions.map((c) => {
              const summary = diagnosis.conditionSummaries[c]
              return (
                <Box key={c} marginLeft={1}>
                  <Text color="gray">- {CONDITION_TITLES[c]}: </Text>
                  <Text
                    color={summary.failureRate === 0 ? 'green' : 'yellow'}
                    bold
                  >
                    {Math.round(summary.failureRate * 100)}% failure
                  </Text>
                  <Text color="gray">
                    {' '}
                    ({summary.passedRuns}/{summary.totalRuns} passed)
                  </Text>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export function createTerminalLiveController(testPattern: string, reruns: number, isFast = false, isSafe = false) {
  const initialProgress: Record<FlakeCondition, { current: number; total: number; passed: number; failed: number }> = {
    baseline: { current: 0, total: reruns, passed: 0, failed: 0 },
    seed: { current: 0, total: reruns, passed: 0, failed: 0 },
    clock: { current: 0, total: reruns, passed: 0, failed: 0 },
    order: { current: 0, total: reruns, passed: 0, failed: 0 }
  }

  let state: TerminalUIProps = {
    testPattern,
    reruns,
    isFastMode: isFast,
    isSafeMode: isSafe,
    activeCondition: 'baseline',
    progress: initialProgress,
    completedConditions: [],
    summaries: {},
    isDone: false
  }

  const app = render(<TerminalUI {...state} />)

  return {
    onProgress(event: { condition: FlakeCondition; runIndex: number; totalRuns: number; passed: boolean }) {
      state = {
        ...state,
        activeCondition: event.condition,
        progress: {
          ...state.progress,
          [event.condition]: {
            current: event.runIndex,
            total: event.totalRuns,
            passed: state.progress[event.condition].passed + (event.passed ? 1 : 0),
            failed: state.progress[event.condition].failed + (event.passed ? 0 : 1)
          }
        }
      }
      app.rerender(<TerminalUI {...state} />)
    },
    onConditionComplete(summary: ConditionSummary) {
      state = {
        ...state,
        completedConditions: [...state.completedConditions, summary.condition],
        summaries: {
          ...state.summaries,
          [summary.condition]: summary
        }
      }
      app.rerender(<TerminalUI {...state} />)
    },
    finish(diagnosis: DiagnosisResult) {
      state = {
        ...state,
        isDone: true,
        diagnosis
      }
      app.rerender(<TerminalUI {...state} />)
    },
    unmount() {
      app.unmount()
    }
  }
}
