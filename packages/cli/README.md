# flakerad

> A controlled diagnostic instrument for flaky tests.  
> Built and created by **Ayush Dubey**.

Flakerad reruns a failing test under four controlled conditions:
1. **BASELINE**: Repeated normal runs
2. **FIXED SEED**: Patches `Math.random` and seeded PRNG modules via module interception
3. **FROZEN CLOCK**: Injects `@sinonjs/fake-timers` / mock epoch
4. **ISOLATED ORDER**: Runs the target test alone in dedicated process without neighbor tests

Whichever condition drops the failure rate to zero while baseline fails intermittently is the attributed root cause.

## Quick Start

```bash
# Direct execution
npx flakerad watch ./tests/my-test.spec.ts

# Detect runner and initialize config
flakerad init

# View SQLite history
flakerad history

# CI annotations
flakerad ci ./tests/my-test.spec.ts
```

## Options
- `-r, --reruns <count>`: Number of reruns per condition (default: 8)
- `--fast`: Fast mode (4 reruns, reduced confidence)
- `--safe-mode`: Capped at 3 reruns to avoid unsafe mutations
- `--json`: Output structured JSON report
- `--no-ui`: Disable interactive Ink UI

Created by **Ayush Dubey**.
