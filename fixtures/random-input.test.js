/**
 * Fixture: Random Input Flake
 * Root Cause: Non-deterministic random input
 * Resolving Condition: Fixed Seed
 * Created by Ayush Dubey
 */

function runTest() {
  // Samples random input without a fixed seed
  const rolls = [Math.random(), Math.random(), Math.random()]

  const threshold = 0.35

  for (const roll of rolls) {
    if (roll < threshold) {
      throw new Error(
        `Random input out of acceptable tolerance: roll was ${roll.toFixed(4)}, expected >= ${threshold}`
      )
    }
  }

  return true
}

try {
  runTest()
  if (process.env.FLAKERAD_DEBUG) {
    console.log('[PASS] random-input.test.js')
  }
  process.exit(0)
} catch (err) {
  console.error(`[FAIL] random-input.test.js: ${err.message}`)
  process.exit(1)
}
