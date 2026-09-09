#!/usr/bin/env node
import './polyfill.js'
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

import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { diagnoseCommand } from './commands/diagnose.js'
import { historyCommand } from './commands/history.js'
import { ciCommand } from './commands/ci.js'

const program = new Command()

program
  .name('flakerad')
  .description('A controlled diagnostic instrument for flaky tests by Ayush Dubey')
  .version('0.2.0')

program
  .command('init')
  .description('Detect test runner and initialize .flakeradrc.json configuration')
  .option('-f, --force', 'Overwrite existing .flakeradrc.json')
  .action(async (options) => {
    await initCommand(options)
  })

program
  .command('watch <testPattern>')
  .alias('diagnose')
  .alias('run')
  .description('Run target test under the four controlled conditions to isolate root cause')
  .option('-r, --reruns <count>', 'Number of reruns per condition (default: 8)')
  .option('--fast', 'Fast mode: fewer reruns with reduced confidence')
  .option('--safe-mode', 'Safe mode: cap reruns at 3 to prevent unsafe side-effects')
  .option('--runner <runner>', 'Explicit test runner (jest, node)')
  .option('--json', 'Output diagnosis as JSON')
  .option('--no-ui', 'Disable interactive terminal UI and print raw logs')
  .action(async (testPattern, options) => {
    try {
      await diagnoseCommand(testPattern, options)
    } catch (err: unknown) {
      console.error('[flakerad] Error during diagnosis:', err)
      process.exit(1)
    }
  })

program
  .command('history')
  .description('Display or export local SQLite log of diagnosed tests')
  .option('--export <format>', 'Export format (json)')
  .option('--limit <count>', 'Number of recent records to show (default: 20)')
  .action((options) => {
    historyCommand(options)
  })

program
  .command('ci <testPattern>')
  .description('Run diagnosis with GitHub Actions annotations and CI exit codes')
  .option('-r, --reruns <count>', 'Number of reruns per condition (default: 8)')
  .option('--fast', 'Fast mode (4 reruns)')
  .option('--safe-mode', 'Safe mode (capped at 3 reruns)')
  .option('--strict', 'Exit with code 1 on any detected flake (even if root cause is identified)')
  .action(async (testPattern, options) => {
    try {
      await ciCommand(testPattern, options)
    } catch (err: unknown) {
      console.error('[flakerad] CI execution error:', err)
      process.exit(1)
    }
  })

program.parse(process.argv)
