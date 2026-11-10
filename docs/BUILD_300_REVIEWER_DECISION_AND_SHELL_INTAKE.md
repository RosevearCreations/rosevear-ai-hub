# Rosevear AI Hub 300 — Original Windows Reviewer Decision Evidence Contract, Source Revision Recheck & Authorized Shell Intake Readiness

Build 300 adds a **private, offline, non-authorizing** reviewer decision contract and Shell intake readiness preview under System → Original Windows adoption → Build 299. The feature does not sign or verify receipts, authenticate an independent reviewer, contact Ree's Windows server or establish a live Master Shell connection. `dev`/`main` CI success proves software readiness only.

## Delivered

1. **Reviewer decision candidate:** A separate owner-supplied JSON disposition, linked to the Build 299 reviewer reference and Build 297 source revision. Only `DEFER_PENDING_INDEPENDENT_EVIDENCE` or `REJECT_CANDIDATE` is permitted. Candidate inputs cannot claim authenticated identity, verified receipt, signed consent or authorized Shell transport.
2. **Source revision recheck:** The owner enters a current 40-character lowercase GitHub `main` SHA. It must match the expected source revision and the separately correlated provenance packet. This remains **owner-reported** information; no authenticated GitHub or original-host revision is fetched. A missing or different SHA blocks preparation.
3. **Decision integrity and chronology:** Exact metadata schema, distinct opaque case/decision references, bounded input (4 KiB), reviewer linkage, source identity, UTC ordering, freshness and conservative failure codes. Rejection remains blocked even if metadata matches.
4. **Authorized intake readiness boundary:** A matching deferred candidate can produce `READ_ONLY_PACKET_PREPARED_HOLD`, meaning the *format* is ready for future independent evidence intake — **not** authorization to transmit or publish. The optional downloaded JSON is sanitized and states `HOLD`, `NOT_GRANTED`, `DISABLED`, zero messages and `published:false`. The owner must explicitly acknowledge those limits.

## Strict decision candidate JSON contract (metadata only)

Only these 13 fields are accepted, with no additional fields:

| Field | Accepted value |
| --- | --- |
| `schema` | `rosevear.ai-hub.reviewer-decision-candidate.v1` |
| `sourceId` | `rosevear-ai-hub` |
| `sourceSha` | Exact lowercase 40-character SHA matching the source revision |
| `reviewerReference` | Opaque uppercase 4–64 character Build 299 reviewer code |
| `decisionReference` | Distinct opaque uppercase 4–64 character code |
| `decidedAtUtc` | ISO UTC timestamp with milliseconds, not before reviewer timestamp |
| `decision` | `DEFER_PENDING_INDEPENDENT_EVIDENCE` or `REJECT_CANDIDATE` |
| `evidenceOrigin` | `OWNER_SUPPLIED_METADATA_ONLY` |
| `reviewerIdentityState` | `NOT_VERIFIED` |
| `originalReceiptState` | `NOT_VERIFIED` |
| `ownerConsentState` | `NOT_VERIFIED` |
| `shellAuthority` | `NOT_GRANTED` |
| `transport` | `DISABLED` |

Do not fabricate independent reviewer evidence to clear any gate. Do not paste personally identifying information, signatures, original proof bytes, credentials, keys, device/network data or private customer data. This format is **not** suitable for signed evidence; that requires a separate protected, authenticated original-source workflow.

## Owner walkthrough

1. In the original-Windows review interface, open Build 299, then **Open Build 300 private decision review**. The new component stays unmounted otherwise.
2. Enter a fresh owner-observed `main` revision and the existing private Build 297 packet plus Build 299 reviewer candidate. Enter a genuine, separately supplied metadata-only decision candidate if available; otherwise leave it blank and let the screen report HOLD.
3. Inspect revision drift, reviewer linkage, time validity and the independent-authority gap. Correlated metadata alone always retains `INDEPENDENT_AUTHORITY_MISSING`.
4. Optionally acknowledge the limitations and download the sanitized Shell intake HOLD preview for *offline* review. Neither AI Data Platform nor Comms Hub is contacted.

**Release distinction:** A GREEN GitHub `main` workflow does not make the physical Windows host, independent reviewer, signed receipt, owner consent or Master Shell transport GREEN. These remain `HOLD` until independently proven and explicitly authorized.

**Next proposed Build 301 — Original Windows Evidence Authority Enrollment Checklist, Protected Intake Boundary & Shell Receipt Replay Guard.**
