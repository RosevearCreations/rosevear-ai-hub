# Build 254 — Promotion event deduplication and queue-time budget

## Exact release event contract

- `pull_request` targeting `dev`: all five original verification jobs, plus an
  observational `ci-budget` summary. This verifies the reviewed feature source.
- `pull_request` targeting `main`: the same five original jobs plus the budget
  summary. This verifies the release merge candidate after `dev` is updated.
- `push` to `main`: all five original jobs plus the budget summary, independently
  checking the exact protected production merge commit.
- **No `push` to `dev` event**: it repeated the same source-tree verification
  immediately after the feature PR merged. No protected production check is
  removed. The main-push witness must never be canceled as PR heads change.

For the standard feature-PR → dev → production-PR → main promotion, this changes
the workflow count from **four to three per promotion (25% fewer workflow
executions)**. The five original verifiers remain independent on each of those
three events. The new read-only budget-summary job adds lightweight accounting
inside existing runs (20 old job executions to 18 new for the same promotion,
assuming four old and three new events). This is a structural target, not a
claim that queue time or the entire GitHub Actions backlog has been measured.

## Required-check equivalence

Every surviving event runs the unchanged core gate names:

1. `docs-foundation`: immutable source and contract/safety guards.
2. `backend`: Python lint, formatting and complete test suite.
3. `web`: TypeScript, complete Vitest suite once, and production build.
4. `backup-windows`: Windows backup/recovery regression and synthetic drill.
5. `desktop-windows`: Windows PowerShell guard tests, Rust check, executable
   compilation and artifact upload with missing artifacts treated as an error.

`ci-budget` uses `needs` on all five. It runs even when a gate fails but returns
non-success when any needed or independently queried job is missing, skipped,
incomplete or failed. It cannot turn a failed gate into GREEN. The GitHub API
token is scoped to read-only `contents` and `actions`; it cannot write repository
data. No token, paths, customer data, device logs, signer keys or raw Windows
process evidence are published by the summary.

## Queue and runtime budget

- Longest required-job queue: warn above **300 seconds**.
- Required-gate wall time: warn above **900 seconds**.
- Record per-gate queue and runtime seconds, run ID, event/scope, and head SHA
  in the GitHub Actions job summary.
- Time-budget warnings are telemetry, not required-check overrides. A legitimate
  runtime overage is not a reason to skip Windows tests or security checks.

Each new promotion should review the three surviving runs, their summary tables,
the five job conclusions, the exact `main` SHA, and the final `main` push result.
Do not classify an installed Windows release or process as attested merely
because GitHub source CI is GREEN; the independent original-issuer and on-host
evidence requirements of Builds 249–253 remain HOLD until satisfied.

## Local and GitHub acceptance

Run `node scripts/ci-foundation-contract.test.mjs` and
`node scripts/ci-run-budget-254.test.mjs`. For deployment, observe feature PR,
production PR and `main` push workflow results, with all five original jobs
and the new `ci-budget` job successful. Confirm no `dev` push workflow was
created by the feature merge. Compare the exact `dev` and `main` Git tree IDs.
