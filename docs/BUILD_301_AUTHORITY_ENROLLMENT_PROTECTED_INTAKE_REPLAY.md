# Rosevear AI Hub 301 — Original Windows Evidence Authority Enrollment Checklist, Protected Intake Boundary & Shell Receipt Replay Guard

Build 301 extends System → Original Windows adoption → Build 300 with an offline **authority enrollment prerequisites checklist**, a strict metadata-only intake boundary, and an ephemeral replay simulation. No original host, reviewer, signer, witness, owner consent or Master Shell receiver is enrolled by this build. GitHub CI cannot authenticate the physical Windows machine.

## Delivered and safety boundaries

1. **Enrollment checklist:** Lists five independent authority requirements: original Windows host/process, source issuer/signer, independent reviewer/witness, signed owner consent, and Master Shell receiver/nonce ledger. Every gate remains `PROTECTED_INDEPENDENT_PROOF_REQUIRED`. There is no enrollment button, credential input or authority mutation.
2. **Protected intake boundary:** An on-demand panel nested under Build 300 accepts only a bounded (4 KiB), metadata-only unsigned replay *candidate* with an exact schema. It also requires a properly correlated, deferred Build 300 review. Real receipts, signature bytes, private keys and personally identifying information must never be pasted into this browser.
3. **Replay simulation:** Records at most 50 local browser-session candidate fingerprints. A repeated receipt reference, nonce, claimed digest or source sequence blocks the simulation. Clock validity (not expired, maximum ten-minute claim lifetime) and source SHA are enforced. This is NOT a durable nonce ledger and cannot prove replay safety across browsers, restarts, servers or machines.
4. **Fail-closed Shell status:** Explicit owner acknowledgement permits an offline sanitized JSON checklist showing only source revision, missing authority gate codes, simulation count and `HOLD`/`NOT_CONNECTED`/`DISABLED`. No raw receipt references, nonce, digest, reviewer information, credentials or private Windows device data are exported. AI Data Platform and Comms Hub are labelled as future review destinations, never contacted.

## Exact unsigned candidate schema

Only these twelve fields are allowed (no extra fields):

| Field | Constraint |
| --- | --- |
| `schema` | `rosevear.ai-hub.receipt-replay-candidate.v1` |
| `sourceId` | `rosevear-ai-hub` |
| `sourceSha` | Lowercase 40-character source SHA, matching the Build 300 source |
| `receiptReference` | Opaque uppercase code, 4–64 characters (`A-Z`, digits, `_`, `-`) |
| `receiptDigestClaim` | Lowercase 64-character **unverified claim**, not a cryptographic receipt |
| `nonceReference` | Distinct opaque uppercase 4–64-character code |
| `sequence` | Safe integer from 1 to 1,000,000 |
| `issuedAtUtc`, `expiresAtUtc` | Canonical UTC milliseconds; maximum ten-minute lifetime |
| `evidenceOrigin` | `OWNER_SUPPLIED_METADATA_ONLY` |
| `signatureState` | `NOT_VERIFIED` |
| `publisherAuthorization` | `NOT_GRANTED` |

This is a simulation format only; it intentionally cannot express `VERIFIED`, `APPROVED`, `SIGNED` or `CONNECTED`. An authentic protected intake service would need separately established trust anchors, authenticated source and recipient, durable transactionally unique nonce storage, original evidence and consent validation, expiry/replay policy, audit controls and explicit owner authorization.

## Owner walkthrough

1. Open the original Windows review screen → Build 299 → Build 300 → **Open Build 301 protected-intake review**.
2. Review the five still-missing independent authorities. If a genuine Build 300 deferred decision and sanitized candidate exist, the local replay simulation can examine its exact metadata format. Do not generate fictitious signers, witnesses or receipts to clear a gate.
3. For a replay demonstration, explicitly acknowledge the limitations and select **Simulate unsigned candidate** once; a second attempt with the same reference, nonce, digest or source sequence is blocked. **Clear** removes the session-only fingerprints.
4. Optionally download the sanitized HOLD checklist for owner review. This is not sent to AI Data Platform or Rosevear Comms Hub.

**Important:** Production code can be GREEN while all original Windows acceptance, receipt verification, owner consent, authority enrollment and live Shell integration are still **HOLD**. No automatic release gate should convert the latter into trusted/connected status.

**Next proposed Build 302 — Original Windows Protected Intake Operator Workflow, Source-Signed Receipt Requirements & Shell Enrollment Exception Escalation.**
