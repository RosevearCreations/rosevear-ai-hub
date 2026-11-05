# Build 252 — CI Verification Consolidation, Required-Gate Preservation & Promotion Queue Reduction

## Actual change

The single existing GitHub Actions workflow previously ran many overlapping web test selections and then ran `vitest run` again against **all** tests. Build 252 keeps the final complete suite, `--maxWorkers=1` for the established jsdom resource limit, typecheck and production build, but removes the redundant individual selections. Every web spec—including historical QL regression suites and Builds 245–251—is still discovered by the unfiltered `vitest run` command. A source contract test now checks that this remains true and guards the five independently reported jobs.

## Release boundaries kept intact

- `docs-foundation`: source/manifest and cryptography HOLD regressions, plus the CI contract test.
- `backend`: Python lint, formatting and complete pytest suite.
- `web`: TypeScript, the complete Vitest suite once, and production bundle build.
- `backup-windows`: Windows-specific encrypted backup/recovery tests and synthetic drill.
- `desktop-windows`: Windows PowerShell safety checks, Rust executable build and required artifact upload.
- GitHub `pull_request` and `push` verification for **both** `dev` and `main` stays enabled. Do not change branch protection, skip a promotion stage, allow test failures, or treat a canceled run as GREEN.

## Honest operational impact

This reduces **duplicate web test commands and runner minutes per workflow**, not the number of GitHub workflow *events* per full promotion. That event count is still driven by the required PR and push gates on `dev` and `main`. A later CI Phase II can evaluate event-count reduction only after the owner explicitly accepts a replacement gate design with equivalent independent commit and Windows evidence. Measure workflow and job duration before/after; no claimed speedup is established until actual runs finish.

## Windows / security HOLD

No signer enrollment, signed artifact-kind manifest, Windows installed-process identity, task mutation, encrypted private relay, service restart or supervised recovery was authorized in this build. GREEN source CI is not proof that the local installed Windows Hub is updated. Source proof and physical owner acceptance remain separate.

## Next build

**Build 253 — Signed Artifact-Kind Manifest, Independent Windows Mapping Witness & Supervised Process-Attestation Review.** Continue from the Build 251 signer/artifact custody HOLD, without automatic host changes or unverified trust promotion.
