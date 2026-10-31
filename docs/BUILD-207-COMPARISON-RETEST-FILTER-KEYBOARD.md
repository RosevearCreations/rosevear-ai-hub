# Build 207 — Comparison follow-up, Windows retest filters and keyboard recovery

- Owner diagnostics comparison has an accessible **All compared / Changed only** filter with bounded counts and an explicit empty state. Manual service-check links remain non-mutating and reveal the target even when service status filters were active.
- Windows retest review has accessible filters for **all failures, awaiting retest, persistent issues and owner-reported improvements**. Filtering changes presentation only: no retest, follow-up, local audit or independent witness classification is rewritten. Summary links restore the All view before routing to a retest input.
- Recovering a valid fixed-choice owner checkpoint restores keyboard focus to the status message, with `aria-live` readback and no automatic recovery or credential storage.

Safety: QL-275 remains **Under Review / deferred**; integration **DISCONNECTED/HOLD**, private relay **OFF**, authenticated gateway GETs **0**. This build performs no automatic repair, network probes beyond existing on-demand status checks, device control or Windows acceptance.

Verify with `npm run build:207:hub:test`, `npm run web:build`, full web suite and required GitHub feature/dev/exact-main workflows.

Next planned: **Build 208 — Diagnostic Comparison Exception Triage, Windows Retest Filter Persistence Review & Standard Theme Owner Recovery Usability (QL-275 Deferred).**
