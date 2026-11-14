# Rosevear AI Hub Build 336 / QL-445 — independently reconciled OFF stability and recurrence

Source implementation of [Comms QL-445](https://github.com/RosevearCreations/rosevear-comms-hub/blob/main/docs/handoffs/QL445_MASTER360_POSTCLOSURE_OFF_STABILITY_REVIEW.md) after Build 335 original main code release GREEN.

## Protected verification

- `master_shell_prior336.py` revalidates the protected QL-431–444 Ed25519 lineage and exact original QL-444 PENDING + CLOSED receipts; validates the distinct REMEDIATION receipt for expired-lease cases, prior signed original host, two independent OFF samples, canonical three Master votes, original two-owner decisions and full evidence-digest continuity.
- `master_shell_stability336.py` requires a fresh watch ID and nonce, original Windows host DESKTOP-AE894KC, signed separate Comms source, watchdog-armed signed original host probes, two separately signed independent receiver readings, strictly advancing time and sequence, and explicit digest chaining to the QL-444 second independent sample. Each independent reading must agree with its host observation.
- Two signed OFF/OFF reconciliations produce only `DURABLE_QL445_POSTCLOSURE_OFF_STABILITY_EVIDENCE_ADMITTED`; a signed ON at either paired reading opens `DURABLE_QL445_SIGNED_ON_RECURRENCE_INCIDENT_OPEN`. Missing, stale, altered or diverging readings reject admission and remain HOLD; recognized divergence raises `recurrenceSuspected`.
- Three individually pinned signed Master evaluations and two distinct original-owner signatures must bind exact classified evidence and historical QL-444 protected closure. No one reviewer can grant CONNECTED.
- `ProtectedStabilityJournal336` uses original-host only absolute private custody with exclusive 0600 file creation, 0700 directory, fsync of file and directory, one-use PENDING -> mutually exclusive STABLE or RECURRENCE, and verified cold readback. An interrupted PENDING is non-replayable.
- Owner-only authenticated no-store GET `/api/v1/system/master-shell-336-stability` and `Ql445OwnerStabilityPanel` show source state without implying live receiver status. Without real independently enrolled sources they return UNKNOWN/HOLD.

## Non-negotiable safety boundary

All outcomes: `connection=HOLD`, `activationAuthorized=false`, `physicalReceiverCurrentlyOff=false`, manual isolation remains required, and no real receiver actuator, key enrollment or remote control is present. A code-green GitHub release is not a physical Windows deployment or original signer proof.

The synthetic tests exercise signed stable, signed ON recurrence, remediated expired lease inheritance, tampered source, forged/wrong-machine probe, watchdog off, signature mismatch, nonce/sequence replay, state divergence, missing/forged Master, owner collision, journal symlink/receipt drift and interrupted PENDING.

## Promotion

Feature PR to dev: 6/6 protected checks GREEN; merge to dev. Isolated ten-file production PR from exact main baseline (omit unrelated dev-only handoff). Six independent main PR checks GREEN; merge. Six new exact postmerge main push checks GREEN, then declare `main` code Production GREEN, not physical receiver GREEN. No check may be bypassed.

Next proposed: **Rosevear AI Hub Build 337 / QL-446 — Protected Post-Closure Recurrence Evidence Escalation, Multi-Horizon OFF Sampling & Owner-Gated Three-Master Reopening Decision.**
