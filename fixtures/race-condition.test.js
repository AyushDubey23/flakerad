/**
 * Fixture: Race Condition Flake
 * Root Cause: Timing sensitivity / asynchronous race against deadline
 * Resolving Condition: Frozen Clock
 * Created by Ayush Dubey
 */

async function runTest() {
  const start = Date.now()

  // Simulate an async operation with realistic timing jitter
  await new Promise((resolve) => setTimeout(resolve, 15))

  const elapsed = Date.now() - start

  // Threshold: if elapsed wall-clock time exceeds 14ms, fails due to event-loop jitter.
  // Under frozen clock (inject-clock.cjs), Date.now() is mocked to return the fixed epoch,
  // making elapsed === 0 <= 14ms (100% deterministic pass).
  // Under baseline, seed, and order, real timer jitter causes elapsed to exceed 14ms ~40-50% of runs.
  const deadlineMs = 14

  if (elapsed > deadlineMs) {
    throw new Error(
      `Race condition timeout: operation took ${elapsed}ms, exceeding deadline of ${deadlineMs}ms`
    )
  }

  return true
}

runTest()
  .then(() => {
    if (process.env.FLAKERAD_DEBUG) {
      console.log('[PASS] race-condition.test.js')
    }
    process.exit(0)
  })
  .catch((err) => {
    console.error(`[FAIL] race-condition.test.js: ${err.message}`)
    process.exit(1)
  })
