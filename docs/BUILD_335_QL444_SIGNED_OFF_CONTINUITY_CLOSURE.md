# Rosevear AI Hub Build 335 / QL-444 — Independent OFF continuity and owner-gated closure

Source-side implementation of [Comms QL-444](https://github.com/RosevearCreations/rosevear-comms-hub/blob/main/docs/handoffs/QL444_MASTER360_OFF_CONTINUITY_REMEDIATION_CLOSURE.md) strictly after Build 334 main code GREEN.

## Scope and hardware boundary

- `master_shell_prior335.py`: verifies **original signed QL-431–443 ancestry**, exact QL-443 protected one-use PENDING and ADMITTED/EXCEPTION receipts, signed original source, AI Platform classification, signed previous independent OFF, three canonical signed Masters and original dual owners. Revalidates all digests and original lease disposition, not a UI badge.
- `master_shell_continuity335.py`: enforces original host DESKTOP-AE894KC, separately pinned signed Comms source and watchdog-armed host OFF continuation, strictly increasing OFF sequence, two separately signed independent samples under fresh watch ID/nonce, second sample at least 1 second after first and chained to first digest. **No receiver actuator.**
- Expired QL-443 leases require distinct original owner/reviewer remediation signatures, matching cause and SHA-256 corrective evidence, a separate protected durable one-use REMEDIATION receipt, then signed canonical three-Master decisions and two original-owner evidence-only closeout signatures. Missing or conflicting signatures keep HOLD.
- Distinct protected QL-444 PENDING -> optional REMEDIATION -> CLOSED receipts use absolute private 0700 directory, 0600 exclusive file, fsync and no replay; tampered/symlink/collision and interrupted PENDING do not create a false closure.
- `api/master_shell_continuity335.py` owner-authenticated no-store read-only GET and `Ql444OwnerContinuityPanel.tsx` navy/purple Master Command panel. Without original-host signed external evidence the truthful result is **UNKNOWN/HOLD**. No manual simulation is represented as live proof.
- `server/tests/test_master_shell_continuity335_signed.py` synthetic on-time and late-remediated positives plus forged source, wrong original host, watchdog OFF-to-ON, missing samples, timestamp/sequence rewind, new nonce replay, missing Master, owner collision, changed QL-443 protected receipt, interrupted PENDING, and protected symlink/terminal replay.

## Verification semantics

Code-level `DURABLE_QL444_WITNESSED_OFF_INCIDENT_EVIDENCE_CLOSED` or `DURABLE_QL444_REMEDIATED_LEASE_EXCEPTION_EVIDENCE_CLOSED` means only that **historical signed incident evidence** passed the protected synthetic/admission gates. Neither means a physical pilot ended or that the receiver is currently OFF. Every path preserves `connection=HOLD`, `activationAuthorized=false`, `physicalReceiverCurrentlyOff=false`, `incidentClosed=false`, `receiver=UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION`, manual isolation and a separate fresh independently witnessed live OFF requirement.

Real DESKTOP-AE894KC source signer enrollment, independent external receiver witnesses, two original owner signatures and actual Windows agent delivery are **not certified by GitHub CI**. Test-only Ed25519 identities are never production keys.

## Promotion gates

1. Six feature PR checks GREEN at exact head SHA before merging to dev.
2. Dev squash; duplicate dev push CI intentionally skipped by existing policy.
3. Isolated main candidate on current verified production main; only this build's scoped files.
4. Six protected main PR jobs GREEN, then protected merge.
5. Six *separate* exact main push jobs GREEN and main SHA confirmation before code production GREEN.
6. Independently verify physical original-host installation and observed live OFF; never infer it from GitHub.

Next proposed **Build 336 / QL-445 — Independently Reconciled Post-Closure OFF Attestations, Recurrence Detection & Three-Master Operational Stability Review.**
