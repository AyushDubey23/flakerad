/**
 * Fixture: Shared State / Test-Order Flake
 * Root Cause: Test-order dependency via shared module state
 * Resolving Condition: Isolated Order
 * Created by Ayush Dubey
 */

// Shared module-level singleton state
const sharedSessionStore = {
  activeSession: null
}

function runPrecedingSiblingTest() {
  // Test A: simulates a prior test in the suite that leaks state
  sharedSessionStore.activeSession = {
    userId: 'usr_8492',
    token: 'jwt_leaked_session',
    role: 'admin'
  }
}

function runTargetTest() {
  // Test B: expects a clean guest session state
  if (sharedSessionStore.activeSession !== null) {
    throw new Error(
      `Shared state contamination: expected guest session to be empty, but found leaked session for ${sharedSessionStore.activeSession.userId}`
    )
  }

  return true
}

// When run in isolated mode (FLAKERAD_ISOLATED=1 or FLAKERAD_CONDITION='order'),
// only the target test runs in a clean process without preceding sibling tests.
// Otherwise (baseline, seed, clock), the entire suite / neighbor runs first and leaves dirty state.
const isIsolated =
  process.env.FLAKERAD_ISOLATED === '1' ||
  process.env.FLAKERAD_CONDITION === 'order'

try {
  if (!isIsolated) {
    // Sibling test ran before target test
    runPrecedingSiblingTest()
  }

  // Target test
  runTargetTest()

  if (process.env.FLAKERAD_DEBUG) {
    console.log('[PASS] shared-state-order.test.js')
  }
  process.exit(0)
} catch (err) {
  console.error(`[FAIL] shared-state-order.test.js: ${err.message}`)
  process.exit(1)
}
