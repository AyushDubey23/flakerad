# flakerad

[![npm version](https://img.shields.io/npm/v/flakerad.svg?style=flat-square&color=4F9C8C)](https://www.npmjs.com/package/flakerad)
[![CI](https://img.shields.io/github/actions/workflow/status/AyushDubey23/flakerad/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/AyushDubey23/flakerad/actions)
[![Technical Documentation](https://img.shields.io/badge/docs-technical%20documentation-D97757.svg?style=flat-square)](https://drive.google.com/file/d/1mD5BZMORi_Ru9aSe7_z2TSSK1IydWnub/view?usp=sharing)
[![License: MIT](https://img.shields.io/badge/license-MIT-7B7290.svg?style=flat-square)](LICENSE)

> A controlled diagnostic instrument for flaky tests.  
> Built and created by **Ayush Dubey**.

Flakerad reruns a failing test under four controlled conditions:
1. **BASELINE**: Repeated normal runs
2. **FIXED SEED**: Patches `Math.random` and seeded PRNG modules via module interception
3. **FROZEN CLOCK**: Injects `@sinonjs/fake-timers` / mock epoch
4. **ISOLATED ORDER**: Runs the target test alone in dedicated process without neighbor tests

Whichever condition drops the failure rate to zero while baseline fails intermittently is the attributed root cause.

## Actionable Remediation Guidance (v0.2.0+)

Flakerad pairs every causal diagnosis with actionable engineering remedies:
- **Non-deterministic input**: Seed random generators explicitly (`faker.seed(1234)`) or mock `Math.random` via `jest.spyOn(Math, 'random')`.
- **Timing / race condition**: Replace arbitrary `setTimeout` sleeps with condition-based polling (`waitFor()`) or explicit event promises.
- **Test-order / shared-state**: Isolate module singletons and clean up shared global state in `beforeEach`/`afterEach` hooks.
- **Environment-dependent**: Check external network latency, database connection pools, or local port collisions. Mock external service dependencies.

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
