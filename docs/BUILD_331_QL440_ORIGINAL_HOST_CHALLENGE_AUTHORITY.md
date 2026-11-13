# Rosevear AI Hub Build 331 — QL-440 Fresh Original-Host Challenge Authorization

## Authority and dependency gate

Source contract: `RosevearCreations/rosevear-comms-hub/docs/handoffs/QL440_MASTER360_FRESH_CEREMONY_AUTHORIZATION_AND_UI.md`.

**Builds 329 / QL-438 and 330 / QL-439 MUST each be independently merged to dev and scoped main production with exact SHA six-check GREEN before this build can be promoted.** Do not merge diverged dev history into main. Build 331 may be developed in a draft feature branch while dependencies remain unfinished, but no draft code may be treated as authorization.

QL-440 consumes externally verified `DURABLE_QL439_NEW_CEREMONY_REENTRY_READINESS_ONLY` together with protected local QL-439 one-use PENDING and READINESS receipts, their exact digests, original incident, fresh ceremony and episode, prior renewed anchor and independent reader digests. A local status snapshot is not sufficient.

## Required protected supervised sequence

1. Open a protected original-owner session **on DESKTOP-AE894KC**, independently verify the QL-439 original-host chain and source evidence, distinct ceremony/episode, prior signed anchor/reader and three-Master/dual-owner preparation decision. Reject missing, stale, tampered, or unverifiable history.
2. Generate a new challenge nonce **different** from QL-439's renewal nonce. Prepare only `NEW_CEREMONY_CHALLENGE_ONLY_NO_RECEIVER_ON` with exact QL-439 source/receipt bindings.
3. **Before reading external evidence**, create exclusive one-use QL-440 PENDING custody in an absolute protected 0700 directory; use 0600 file, exclusive creation, file and directory fsync and exact readback. An interrupted PENDING remains consumed; never silently retry with the same incident.
4. Obtain fresh separately pinned Ed25519-signed DESKTOP-AE894KC watchdog-armed OFF; require a distinct pinned independent receiver observer signed OFF no earlier than host and with a non-decreasing sequence. Both sign the same incident, ceremony, episode, nonce and exact host digest. Reject ON, TEMPLAR, stale, forged, reused pins, or missing observation.
5. Obtain three distinct signed `PREREQUISITES_ACCEPTED_NEW_CEREMONY_CHALLENGE_ONLY_NO_ON` reports from rosevear-ai-hub, rosevear-comms-hub and ai-data-platform, binding exact request and signed independent OFF digest, in canonical Master order.
6. Require distinct independently verified owner and reviewer signatures on `ISSUE_FRESH_CEREMONY_CHALLENGE_AUTHORITY_ONLY_NO_ON`, bound to request, OFF and Master evidence.
7. Require separately pinned original-host signed `FRESH_QL429_QL430_CEREMONY_CHALLENGE_ONLY_NO_RECEIVER_ON` issuance, binding three-Master and dual-owner decision.
8. Recheck prior QL-439 protected PENDING/READINESS and QL-440 PENDING; claim one-use fsynced ISSUED and reread. Positive code status is `DURABLE_QL440_NEW_CEREMONY_AUTHORIZATION_PREREQUISITES_ACCEPTED` and `ceremonyAuthorizationIssued=true` **only**, never activation. A new separate supervised QL-429/430 challenge is required.
9. Later boot from private ISSUED receipt alone returns `QL440_DURABLE_PRIVATE_ISSUANCE_NEW_OFF_AND_OWNER_CHALLENGE_REQUIRED`; this never proves present physical OFF or key enrollment.

All paths retain `connection=HOLD`, `activationAuthorized=false`, `slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`; missing fresh independent OFF yields `receiver=UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION`. This release MUST NOT expose receiver ON/restart APIs.

## Initial incremental implementation (not release complete)

`server/src/rosevear_ai_hub/master_shell_authorization331.py` provides conservative, unsigned cross-field shape rejection and readback HOLD semantics. Its tests prove invalid/broadened claims are rejected. **Even a valid-looking input returns HOLD**. It intentionally does not verify Ed25519 signatures, perform original-host custody reads, claim a durable one-use journal, or issue authorization. Those steps are mandatory before making the PR mergeable. Do not interpret synthetic tests as evidence of real host/off-host activity.

## Owner master shell visual direction

Continue the 31-page owner reference from Build 330: top release strip, left contextual rail, deep navy/black cards, purple navigation, semantic green/amber/red/blue instruments, responsive desktop/tablet/mobile. QL-440 specifically requires a protected read-only owner landing/diagnostics display; it may show signed evidence summaries but **must never invoke ceremony issuance merely from a browser button**. Source-backed readings only, no fabricated GREEN/CONNECTED. AI Hub is the scope of this PR; other application shells require independent release work.

## Promotion gates

- Build 329 exact dev/main GREEN, then Build 330 exact dev/main GREEN.
- Complete verified signature+pin custody, durable one-use PENDING/ISSUED, independent OFF, three-Master consensus, dual-owner signature and signed original-host issuance, no ON APIs.
- Test signed positive case plus wrong machine, old nonce, wrong receipt, ON, unarmed watchdog, stale/forged independent OFF, reversed sequence, duplicate/missing/broadened Master, broadened owner/issuer, replay and crash/tampered ledger. Verify API owner read-only authorization and forbidden state mutations.
- Exact feature PR six jobs GREEN; merge into dev only after dependencies; verify six dev push jobs; separately construct scoped main candidate without unrelated diverged dev changes, verify six main PR jobs; merge main only after approval and verify exact main push six checks plus deployment/Worker artifact parity. CI GREEN is code release status only, not evidence of physical live receiver or true external keys.

**Next proposed Build 332 — QL-441 Protected Fresh-Ceremony Challenge Consumption, Dual-Owner Runtime Authority Separation & Independently Witnessed Receiver ON Go/No-Go.**
