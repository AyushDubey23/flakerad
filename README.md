<div align="center">

# flakerad.
### a diagnostic instrument for flaky tests

A pass is not a reason. Flakerad finds the *why* behind the flake.

<br/>
<br/>

```bash
npx flakerad watch "should sync user state"
```

<br/>
</div>

<br/>

## the problem

A flaky test is an accusation without proof. It fails sometimes, passes sometimes, and nobody on the team can say why — so it gets skipped, retried, or quietly ignored until it isn't safe to ignore anymore.

A green checkmark on a rerun is not evidence. It's just a coin that landed differently the second time.

Flakerad reruns a failing test under four controlled conditions — one variable changed at a time — and tells you which one actually moved the result.

<br/>

## the four controls

Each run changes exactly one thing. Whichever control turns a failing test into a passing one is your root cause.

| # | Control | What it holds constant | If this fixes it → |
|---|---|---|---|
| 01 | **baseline** | nothing — the honest first run | *(reference point)* |
| 02 | **fixed seed** | `Math.random()` and seeded libs (faker, chance) | **non-deterministic input** |
| 03 | **frozen clock** | `Date.now()`, timers, intervals | **timing / race condition** |
| 04 | **isolated order** | shared module state between tests | **test-order dependency** |

If none of the four resolve it, Flakerad doesn't guess — it flags the test as environment-dependent and hands it back for a human to look at. Abstaining honestly is a feature, not a gap.

<br/>

## install

```bash
npx flakerad init
npx flakerad watch "your test name or pattern"
```

or add it to the project:

```bash
pnpm add -D flakerad
```

<br/>

## usage

```bash
$ flakerad watch "user session should refresh once"

  ↻ baseline        ▓▓▓▓▓▓▓▓▓▓  10/10 runs   4 failed   60% pass
  ↻ fixed seed      ▓▓▓▓▓▓▓▓▓▓  10/10 runs   0 failed  100% pass
  ↻ frozen clock    ▓▓▓▓▓▓▓▓▓▓  10/10 runs   3 failed   70% pass
  ↻ isolated order  ▓▓▓▓▓▓▓▓▓▓  10/10 runs   3 failed   70% pass

  ┌─────────────────────────────────────────────┐
  │ diagnosis: non-deterministic input          │
  │ fixed seed dropped the failure rate to 0%   │
  │ confidence: high (Δ = −40pp vs baseline)    │
  └─────────────────────────────────────────────┘

  → flakerad history --export json
```

Every reading here is a real measurement on the reruns Flakerad actually performed — never a fitted curve, never a guess dressed up as a number.

<br/>

## commands

| Command | Does |
|---|---|
| `flakerad init` | detects your test runner, writes `.flakeradrc.json` |
| `flakerad watch <pattern>` | runs the diagnostic engine on a target test |
| `flakerad history` | local log of every test Flakerad has ever diagnosed |
| `flakerad ci` | GitHub Actions–ready annotations + exit codes |

Flags worth knowing: `--reruns <n>` (default 8), `--safe-mode` (caps reruns for tests with side effects), `--fast` (fewer reruns, reports reduced confidence honestly instead of hiding it).

<br/>

## how it works

```
failing test
    │
    ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   baseline   │ ──▶  │  fixed seed  │ ──▶  │ frozen clock │ ──▶  │   isolated   │
│  the honest  │      │ same random  │      │  same time,  │      │    order     │
│  first run   │      │  every run   │      │  every run   │      │ no neighbors │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
       │                     │                     │                     │
       └─────────────────────┴──────────────┬──────┴─────────────────────┘
                                            │
                                            ▼
                           failure rate compared across all four
                                            │
                                            ▼
                           root cause, or an honest abstention
```

Only ambiguous, residual cases — ones the four deterministic controls can't resolve on their own — are ever handed to a language model for a closed-set classification, and it's allowed to abstain too. Nothing here pretends to be more certain than the evidence supports.

<br/>

## why this exists

Most "flaky test" tooling just retries until green and calls it solved. That's not a fix, it's a bribe. Flakerad's only job is to make the dependency visible — the test didn't become reliable, you just finally saw what it was waiting on.

<br/>

## project layout

```
flakerad/
├── app/         next.js site — the instrument, the field notes, the docs
├── components/  shared UI, themed in the site's editorial palette
├── data/        real output from the fixture suite, never hand-edited
├── cli/         the actual tool — init, watch, history, ci
├── fixtures/    four deliberately flaky tests, one per root cause
└── lib/
```

<br/>

## contributing

Found a genuinely flaky test in the wild that Flakerad misdiagnosed? That's the most valuable bug report there is — open an issue with the test and the four-run output, and it may end up as the next fixture.

<br/>

## repository & bugs

To see the source code, inspect run data, or to find bugs, visit the repository:
- **Repository**: [https://github.com/AyushDubey23/flakerad](https://github.com/AyushDubey23/flakerad)
- **Author**: [Ayush Dubey](https://ayushdubey23.vercel.app)

<br/>

## license

MIT — see [LICENSE](LICENSE).

<br/>

<div align="center">
made for the suspicious
</div>

