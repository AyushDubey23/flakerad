import { diagnoseCommand, DiagnoseCommandOptions } from './diagnose.js'

export async function ciCommand(
  testPattern: string,
  options: DiagnoseCommandOptions & { strict?: boolean } = {}
) {
  // CI runs without interactive Ink UI
  const diagnosis = await diagnoseCommand(testPattern, {
    ...options,
    noUi: true
  })

  const testFile = diagnosis.testPath || testPattern

  if (diagnosis.attributedCause === 'no-flakiness-observed') {
    console.log(`::notice file=${testFile},title=No Flakiness Observed::${diagnosis.explanation}`)
    process.exit(0)
  }

  if (diagnosis.attributedCause === 'environment-dependent, flag for manual review') {
    console.log(
      `::error file=${testFile},title=Unresolved Environment Flake::${diagnosis.explanation}`
    )
    process.exit(1)
  }

  // Root cause found (seed, clock, order)
  console.log(
    `::warning file=${testFile},title=Flaky Test Root Cause Detected (${diagnosis.attributedCause})::${diagnosis.explanation}`
  )

  if (options.strict) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}
