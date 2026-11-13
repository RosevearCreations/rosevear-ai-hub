# Rosevear AI Hub Build 333 — QL-442 signed isolated receiver shutdown

## Sources and release boundary

This build implements the **AI Hub code-side protected original-host evidence workflow**
for AI Data Platform `docs/BUILD_389_QL442_ISOLATED_SHUTDOWN_CLOSURE.md` and the
subsequent Comms Hub `docs/handoffs/QL443_MASTER360_PROTECTED_OFF_CUSTODY_AND_EXCEPTION.md`.
These describe cross-Master evidence, not installed AI Hub code or a real Windows ceremony.
No separate Comms Hub QL-442 handoff file was present in the searched handoff directory.

Build 332 / QL-441 exact signed protected PENDING and DECISION is required. The
QL-431–440 chain, original issuer, independent ON, owner approvals and all Master
GO/NO_GO signatures must revalidate, not merely display a source status badge.

**This build is not a shutdown actuator.** It does not operate, start, restart or
activate a physical receiver, nor authorize CONNECTED, issue signing keys or
messages, or assert that the receiver is currently OFF.

## Implemented components

- `master_shell_prior333.py`: native signed QL-431–441 custody revalidation,
  including the original QL-440 issuer, QL-441 separately signed witness and
  original-host protected PENDING / DECISION readback with exact digest matching.
- `master_shell_shutdown333.py`: independently pinned Ed25519-signed Comms QL-441
  source, DESKTOP-AE894KC watchdog-armed OFF shutdown and separately signed
  independent receiver OFF, monotonic sequence, original challenge and lease,
  expiry comparison against **both** OFF timestamps, canonical three distinct
  signed Master reviews and original dual-owner signed decisions. Wrong TEMPLAR
  source, ON, stale, wrong key, false CONNECTED, late lease claimed ON_TIME and
  owner collusion all fail closed.
- `master_shell_decision333.py`: absolute private 0700 path, exclusive 0600 files,
  fsync file and directory, one-use PENDING before external reads; mutually
  exclusive durable CLOSED *evidence* or EXCEPTION after renewed prior review.
  Interrupted PENDING cannot be reused; symlink/tamper/permissions fail closed.
- `api/master_shell_shutdown333.py`: authenticated **owner-only no-store GET**.
  Without a supervised enrolled original-host evidence feed, source status is
  **UNKNOWN/HOLD**. There is no shutdown/ON/restart write API.
- `Ql442OwnerShutdownPanel.tsx`: existing navy/purple Master Command instrument,
  source-only HOLD, lease UNKNOWN, physical receiver UNKNOWN, three-Master
  witness unverified. No fabricated timestamps or metrics and no other apps modified.

The synthetic tests exercise valid ON_TIME and EXPIRED_EXCEPTION with prior QL-441
GO or veto, changed/forged Comms, host and receiver signatures, wrong host/watchdog,
missing Master and owner collusion, replay, protected predecessor tamper,
exclusive custody and restart UNKNOWN.

## Verified state semantics

Valid signed **ON_TIME** evidence yields
`DURABLE_QL442_SIGNED_SHUTDOWN_EVIDENCE_CLOSEOUT_HOLD` after protected
one-use readback, but not physical pilot closure.

Valid independent OFF after lease expiry yields
`DURABLE_QL442_EXPIRED_LEASE_EXCEPTION_OPEN_HOLD`. A late observation cannot be
silently treated as ON_TIME. Even successful evidence acceptance includes
`connection=HOLD`, `activationAuthorized=false`,
`manualReceiverIsolationRequired=true`, `physicalReceiverCurrentlyOff=false`,
and `receiver=UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION`.

Real DESKTOP-AE894KC ceremony, independently pinned externally enrolled keys,
fresh Comms source and physical OFF observer, protected clock and actual
custodian admission remain **not verified by GitHub CI**. No physical action
or owner decision is asserted from temporary test signatures.

## Release gates

1. Build 332 exact `main` code release must have six production jobs GREEN.
2. Feature PR to `dev` must pass all six jobs on exact current commit.
3. Merge into `dev` only after signed positive/negative and custody tests pass.
   Workflow intentionally omits duplicate `dev` push; do not invent that run.
4. Construct isolated scoped main candidate from current production `main`,
   never merging divergent `dev` history.
5. Require six main PR checks, then six independent exact main push checks.
6. Verify `main` commit hash and applicable live deployment independently
   before claiming a Windows installation.

Next proposed **Rosevear AI Hub Build 334 — QL-443 Protected Shutdown Custody
Admission, Expired-Lease Exception Handoff & Three-Master Fresh OFF Readback Renewal**.
