# Build 203 — Guided Diagnostics Readback, Owner Finding Recovery & Accessible Windows Review Completion

## Implemented in real Hub views

1. **Guided System diagnostics:** the existing read-only local diagnostics panel now summarizes the actual last API sample, counts `Needs attention` and `Not verified` separately, and suggests which service to manually inspect first. Accessible category filters show only matching cards; each displayed card links to the same existing, safe manual checks and authorized workspace navigation. No repair, service restart, new credential intake, background poll, device command, relay or authenticated cross-app GET is introduced.
2. **Owner recovery checkpoint:** the Standard Theme owner can explicitly **Save**, **Recover**, or **Clear** a browser-tab `sessionStorage` checkpoint containing only allowlisted fixed-choice review findings, issue categories, selected device context, on-device observations, symptoms and owner-reported retest/follow-up stages. Recovery is not automatic; later edits require another Save. Reject malformed, oversized, unknown, contradictory or prior-version payloads. Never save raw notes, passwords, API bodies, device identity, private proof, external signer data, owner report text or local retest audit baseline. Administrators cannot act as an owner or save/restore owner findings. Reset clears both current worksheet and saved checkpoint.
3. **Accessible Windows worksheet completion:** a fifth step links to a real checklist of five local-owner requirements: review the five workspaces, select the actual Windows Hub/client, record five observations, classify each failure, and retest failed observations. Every missing step links to the relevant field; completion remains **a local owner worksheet readback only**, even if a failure persists. It cannot assert independently witnessed Windows acceptance, prove a code fix, sign an owner receipt or authorize a TEST connection.

## Verification and release safety

- Input exact `main` baseline `422fa64f0d0220ee4ddf33ba0bb27ab617ab122d`; five-job [main source workflow `41206751533` GREEN](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41206751533).
- The original signed Proof-B public path `docs/integration/ql246-source-proof.json` was HTTP 404 at the Build 202 exact `main` commit. This remains historical original-source evidence, not automatic monitoring or private witness confirmation.
- **QL-275 project state: Under Review / owner-deferred**. **Integration security state: DISCONNECTED / HOLD**, no owner TEST permission, private relay OFF, authenticated gateway GETs 0. None of this changes because a local UI worksheet is complete.
- Source CI runs read-only, synthetic and build validations, not an observed installed Windows machine. Actual Windows owner acceptance requires a separate physical on-device review and legitimate independent witness if requested by the security program.
- Tests: `npm run build:203:hub:test`, `npm run web:typecheck`, `npm run web:build`, existing full web/backend/Windows workflows before promotion.

Next proposed **Build 204 — Diagnostics Source Snapshot Comparison, Owner Recovery Clarity & Windows Review Navigation Assurance (QL-275 Deferred)**.
