# Build 181 — Independent Renewal Disposition Exception Recurrence & QL-253 Original-Proof Provenance Witness Readiness

Status: **source implementation**, private evidence and integration **DISCONNECTED / HOLD**. Main CI GREEN is the source-release gate, not a field or connection approval.

## Implemented

- Compare later Build 180 private disposition notes only when they concern the same pseudonymous case/watch and a *strictly newer* renewal reference. Surface repeated owner/source gaps, source identity drift, and manual recurrence aging.
- Append bounded, strictly validated, private **NOT SENT** recurrence notes only after a fresh installed-Windows recheck, a new (non-imported) later disposition and two explicit HOLD acknowledgements. Imports remain historical-only. Export a complete nested Build 148–181 receipt; invalid edits, extra fields, duplicate actions, reordered chronology and privilege upgrades fail closed.
- Show QL-253 provenance evidence required from GitHub immutable source A and descendant signed proof B; no proof is considered independently trusted merely because a public Ed25519 signature verifies locally.
- Add `npm run integration:ql253:hub:check` (offline default) and `-- --public-get --main <full-40-hex-sha>` (opt-in, only the allowlisted public GitHub proof at an immutable SHA); optional A/B mode uses the existing strict public-only QL-252 comparison. CI tests are synthetic and never create original witness receipts.
- Assess the Rosevear AI Hub Windows PC *as a candidate* always-on relay. No service/daemon, public inbound listener, router port mapping, private DNS, gateway GET, camera/device/vault access, remote shell, token issuance or credential rotation is authorized or installed by this build.

## Source/proof distinction

At QL-253 on 28 October 2026 at 10:43 p.m. Eastern, Comms Hub reported the Hub `main` `f81dc739b8af0bcd6c8ffae00aa5ecc9b9dd197d` and public `docs/integration/ql246-source-proof.json` as HTTP 404. Future source builds must re-fetch at the current exact SHA. Prior QL-252 CI intentionally fails if an unauthenticated proof is added before a separate approved witness/publishing-policy review. Build 181 does **not** manufacture seven independently observed denials or commit a fake signed JSON to bypass this guard.

Source A must have matching completed GREEN Actions CI. Proof commit B (if independently produced) must descend from A and be different; only the *signed payload* names A. Source SHA and proof bytes, signer-pin custody, separate registry/witness attestations, and time-bounded owner TEST permission are distinct gates. A public proof's key fingerprint is **UNTRUSTED** until confirmed out-of-band by an independent custodian and another reviewer.

## Private 24/7 server proposal, not deployment

Potential future transport is outbound-only authenticated connector or owner-managed Tailscale/private routing, provisioned with independent per-app/tenant secrets and short-lived nonproduction scope. Before any installation or authenticated GET, obtain separately authenticated owner approval, verify host/service-account availability, trust/pin custody, revocation/kill switch, rollback and no home/vault/device exposure. No daemon starts in this build.

## Required source checks

`npm run web:typecheck`; `npm run web:test`; `npm run web:build`; backend pytest and Windows CI; `npm run integration:ql253:hub:test`; `npm run integration:ql252:publication:test`; `npm run integration:ql246:contract:test`. QL-253 CLI default must make no network requests. All user-visible integration states remain `DISCONNECTED / HOLD`, owner TEST `NOT_GIVEN`, Vault `0 / 6 SECURITY HOLD`, physical field/reviewer approval pending.

Next: **Build 182 — Independent Private Recurrence Exception Reassessment & QL-254 Trusted Registry Source Proof Renewal**.
