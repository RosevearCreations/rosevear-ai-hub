# Rosevear AI Hub Build 332 — QL-441 Protected Witnessed ON Go/No-Go

## Authority and sequential release requirement

Upstream source: Rosevear Comms Hub `docs/handoffs/QL441_MASTER360_PROTECTED_CHALLENGE_ON_GO_NOGO.md`.

Do not promote this build until **Build 329 QL-438, Build 330 QL-439 and Build 331 QL-440** independently complete the exact six-check source/dev/scoped-main PR/production-push gates. The existing branch histories of `dev` and `main` are divergent; never merge unrelated dev history wholesale into main. A passing feature workflow is not production.

QL-440's ISSUED receipt permits a *separate supervised challenge attempt*, not receiver ON. QL-441 only verifies observations from separately authorized, bounded, isolated ON activity. It does not start/restart a receiver, enroll signing keys, issue customer messages or connect any Master. Every output must keep `connection=HOLD`, `activationAuthorized=false`, `slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`, `manualReceiverIsolationRequired=true`. Even an accepted GO witness means evidence acceptance, not receiver operation approval.

## Protected original-host procedure required before implementation acceptance

1. On **DESKTOP-AE894KC**, independently verify the exact original QL-440 protected PENDING and ISSUED receipts; check the source issuance, prior owner identities, ordered three-Master prerequisite digest, independent OFF and original-host issuer signature. A restored local receipt is not present physical ON/OFF.
2. Generate fresh unique challenge ID, nonce distinct from QL-440's nonce, lease ID and explicit lease expiry no more than **120 seconds** from issuance. Bind exact previous receipts, episode/ceremony, host identity and signer digests.
3. Obtain **two distinct Ed25519-pinned personal-owner approval signatures** for `AUTHORIZE_BOUNDED_ISOLATED_ON_OBSERVATION_ONLY_NO_CONNECT`. One owner or one key may not sign both roles.
4. Before external reads, commit exclusive one-use protected PENDING for the original incident, absolute 0700 directory, exclusive 0600 file, file and directory fsync and exact readback. An interrupted pending attempt cannot be silently resumed or replayed.
5. Independently retrieve the **signed QL-440 original-host issuance envelope** and reverify the pinned key and exact recorded digest.
6. Require separately pinned signed original-host challenge consumption from DESKTOP-AE894KC with an armed watchdog, lease binding, positive sequence and unexpired timestamps. Reject wrong source host (including TEMPLAR).
7. Read and verify signed original-host ON *observation* and a later separately pinned independent receiver ON observer, within lease, with non-decreasing sequence and exact host-ON digest binding. No QL-441 API may cause ON.
8. Collect three distinct signed decisions from rosevear-ai-hub, rosevear-comms-hub, ai-data-platform in canonical order. Only `GO_WITNESS_ACCEPTANCE_ONLY_NO_CONNECT` or `NO_GO_SHUTDOWN_REQUIRED` are permitted. Any signed veto yields aggregate NO_GO.
9. Require the original two distinct owners to sign the exact final decision: GO uses `DUAL_OWNER_GO_ACCEPT_WITNESSED_ON_AND_REQUIRE_SHUTDOWN`; NO_GO uses `DUAL_OWNER_NO_GO_REQUIRE_IMMEDIATE_SHUTDOWN`. Bind source/master initial approvals, independent ON evidence and ordered Master digest.
10. Recheck prior QL-440 receipts and QL-441 PENDING; revalidate lease time; commit one-use protected DECISION with fsync and exact readback. Require **separate supervised shutdown and fresh independent OFF** next. Decision readback after restart is historical only and must return `QL441_PRIVATE_DECISION_FRESH_OFF_AND_LEASE_CLOSEOUT_REQUIRED`.

## Implemented signed source review and read-only owner instrument

The following are **code-level synthetic acceptance only**, not evidence of a live
supervised ceremony, Windows signer enrollment or actual receiver ON/OFF.

- `server/src/rosevear_ai_hub/master_shell_prior332.py` reopens exact QL-431–439
  source-custody and QL-440 protected PENDING/ISSUED, independently verifies
  QL-440 signed host OFF, independent receiver OFF, ordered three Master decisions,
  distinct signed owners and original-host issuer, and reconstructs the ISSUED
  evidence digest.
- `server/src/rosevear_ai_hub/master_shell_decision332.py` implements the private
  absolute-path 0700/0600, exclusive-create, fsynced one-use PENDING/DECISION
  custody and restart-safe UNKNOWN/HOLD projection. A consumed PENDING is never
  silently reused.
- `server/src/rosevear_ai_hub/master_shell_observation332.py` verifies signed,
  time-bounded owner approvals, separately read original signed issuer, host
  challenge consumption and watchdog, original-host ON observation, independently
  pinned receiver ON observation, exactly three signed GO/veto Master decisions,
  and two signed final owner GO/NO-GO decisions. A veto must produce NO_GO. It
  revalidates predecessor custody before DECISION and **never issues ON commands**.
- `server/src/rosevear_ai_hub/master_shell_witness332.py` retains a conservative
  unsigned shape guard that can never make a trusted GO decision.
- `server/src/rosevear_ai_hub/api/master_shell_witness332.py` exposes only an
  owner-authenticated, no-store, HOLD/UNKNOWN GET status. It has **no** receiver
  ON, lease-issuance or restart write route.
- `apps/web/src/Ql441OwnerWitnessPanel.tsx` provides the owner-approved deep
  navy/purple Master Command Receiver & Ceremony instrument, accessible within
  the System workspace to owners only. Unavailable signed sources show HOLD and
  UNKNOWN instead of invented GO, uptime or independent observations.

Synthetic test coverage includes signed GO and independent Master NO_GO veto for
both QL-438 expired-lease classifications, forged and altered host/receiver ON,
wrong host (TEMPLAR), missing watchdog, wrong sequence/digest, issuer absence,
nonce/lease reuse, long/expired lease, owner collusion/broadened authority, missing
Master and mismatched final owner decision; plus private journal tamper,
interruption/replay, permission/symlink protections and unauthenticated API denial.

**Operational limitation:** Original personal-owner authentication, live signing
keys, real independently anchored QL-440 readbacks and physical receiver
observation/shutdown must still occur under a separately supervised
DESKTOP-AE894KC procedure. GitHub CI does not perform that ceremony. No local
receipt or code-green build establishes live ON, OFF, CONNECTED or activation.

The owner-approved 31-page Master Shell visual direction remains scoped to AI
Hub. This build does not change Comms Hub, AI Data Platform, iCamp, Yard Workers,
Rosie Dazzlers or Devil n Dove.

## Gate to promote

Signed synthetic positive GO plus veto NO_GO; absent, forged, replayed, stale, wrong-host and wrong-key signatures; owner collusion; nonce reuse; lease >120 seconds or expiry; incorrect independent ON digest/sequence; three-Master decision forgeries; custody interruption/replay/symlinks/tamper; fail-closed owner UI. Verify six required jobs GREEN on feature PR, scoped main PR and exact main push; compare the exact SHA at every step. The repository intentionally runs checks on PRs to dev and omits duplicate dev-push runs; do not claim a nonexistent dev-push verification. Verify applicable deployment artifact parity independently before any claim of live installation. Only code release health may be GREEN—not physical live receiver status.

**Next proposed Build 333 — QL-442 Signed Isolated Receiver Shutdown, Lease Expiry Enforcement, Independent OFF Attestation & Three-Master Pilot Closure Continuity.**
