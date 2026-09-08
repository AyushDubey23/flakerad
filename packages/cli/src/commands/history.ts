import { openDatabase } from '../history/db.js'

export function historyCommand(options: { export?: string; limit?: string; cwd?: string } = {}) {
  const db = openDatabase()
  const limit = options.limit ? parseInt(options.limit, 10) : 20

  if (options.export === 'json') {
    const all = db.getAll()
    console.log(JSON.stringify(all, null, 2))
    db.close()
    return
  }

  const entries = db.getRecent(limit)
  if (entries.length === 0) {
    console.log(`[flakerad] No test diagnoses recorded in history yet.`)
    db.close()
    return
  }

  console.log(`\n=== FLAKERAD TEST HISTORY (recent ${entries.length}) ===\n`)
  console.log(
    'ID'.padEnd(5) +
    'TIMESTAMP'.padEnd(24) +
    'TEST PATTERN'.padEnd(32) +
    'VERDICT'.padEnd(38) +
    'CONFIDENCE'.padEnd(12) +
    'FAIL RATES (Base/Seed/Clock/Order)'
  )
  console.log('─'.repeat(128))

  for (const entry of entries) {
    const date = entry.timestamp.slice(0, 19).replace('T', ' ')
    const rates = `${Math.round(entry.baselineFailureRate * 100)}% / ${Math.round(
      entry.seedFailureRate * 100
    )}% / ${Math.round(entry.clockFailureRate * 100)}% / ${Math.round(
      entry.orderFailureRate * 100
    )}%`

    console.log(
      String(entry.id).padEnd(5) +
      date.padEnd(24) +
      entry.testPattern.slice(0, 30).padEnd(32) +
      entry.attributedCause.slice(0, 36).padEnd(38) +
      `${Math.round(entry.confidence * 100)}%`.padEnd(12) +
      rates
    )
  }
  console.log('\nUse --export json for full JSON output.\n')

  db.close()
}
