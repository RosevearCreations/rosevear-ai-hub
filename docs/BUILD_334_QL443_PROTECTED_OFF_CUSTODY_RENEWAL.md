# Rosevear AI Hub Build 334 / QL-443 — Protected shutdown custody & three-Master fresh OFF

This is the AI Hub source-side implementation of the [Comms QL-443 handoff](https://github.com/RosevearCreations/rosevear-comms-hub/blob/main/docs/handoffs/QL443_MASTER360_PROTECTED_OFF_CUSTODY_AND_EXCEPTION.md), built strictly after **Build 333 / QL-442** production GREEN.

## Safety boundary

Historical Ed25519 signatures and CI GREEN are **not** original-host deployment, receiver controls, live OFF, CONNECTED, or owner authorization. Every return is HOLD / activationAuthorized=false / manual receiver isolation required. Even a successful protected admission has physicalReceiverCurrentlyOff=false, freshPhysicalOffProven=false and incidentClosed=false. External Windows hardware, original signer enrollment and Comms/AI Data receipts are **not** inferred or fabricated.

## Implemented code

- `master_shell_prior334.py` revalidates original signed QL-431–441 ancestry and original QL-442 source/host/independent OFF/Master/owner signatures, original lease expiry, final evidence hash, and exact protected PENDING+terminal readback. No browser badge can substitute for custody.
- `master_shell_decision333.py` generic protected stage support remains backwards compatible with QL-442. New `ProtectedRenewalJournal334` uses distinct private directory, exclusive 0600 PENDING -> ADMITTED or EXCEPTION, absolute 0700 protected path, fsync and no terminal-stage replay. Interruption permanently consumes the pending nonce.
- `master_shell_renewal334.py` verifies distinct pinned QL-443 Comms source, independent signed AI Data Platform QL-442 classification, renewed independent receiver OFF with strictly increasing sequence, new nonce, fresh timestamp, original lease and historical hash continuity, exactly three distinct signed Master decisions, two distinct signed original owners. Late historical OFF is never reclassified on time.
- `api/master_shell_renewal334.py` owner-only no-store GET status. It truthfully returns UNVERIFIED/UNKNOWN without original-host feeds and has **no actuation or enrollment writes**.
- `Ql443OwnerRenewalPanel.tsx` extends the established midnight navy/purple Master Command System view with owner-only read-only protected evidence status and explicit lease exception / current receiver UNKNOWN labels.

## Synthetic acceptance

`server/tests/test_master_shell_renewal334_signed.py` uses throwaway local signatures to exercise on-time ADMITTED and expired-lease EXCEPTION, signature tamper, stale/replayed OFF, wrong classification, missing Master, owner impersonation, predecessor drift, symlink and interrupted one-use custody. Tests do not contact actual Windows hardware or external services.

## Promotion

1. Feature PR to `dev`: exact six checks GREEN.
2. Merge to `dev` (duplicate push CI intentionally skipped).
3. Isolated production branch from *exact current* `main`, with just the scoped Build 334 files; no divergent unrelated dev history.
4. Main PR: exact six checks GREEN; merge only after passes.
5. Post-merge `main` push: six checks GREEN on exact main SHA.
6. No physical OFF, owner signature, or live receiver state is claimed without an independently witnessed original-host ceremony.

Next proposed: **Rosevear AI Hub Build 335 / QL-444 — Independent Signed OFF Continuity Watch, Lease-Exception Remediation Custody & Owner-Gated Three-Master Incident Closure.**
