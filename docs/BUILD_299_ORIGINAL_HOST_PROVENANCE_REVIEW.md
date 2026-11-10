# Rosevear AI Hub 299 — Original-Host Receipt Provenance Reconciliation, Independent Reviewer Evidence Intake & Fail-Closed Shell Status Export

Build 299 extends System → Original Windows adoption → Build 298 with a browser-session-only, **non-authorizing** provenance comparison and private status export. It neither retrieves original evidence nor authenticates original-host issuers, humans, signatures or Windows process identities.

## Delivered

1. **Receipt provenance correlation:** Strict Build 298 review of an existing Build 297 private metadata packet; then compares the claimed custody digest and expected exact 40-character source revision to a separately supplied reviewer candidate. Mismatched SHA, digest, timestamps, old packet or missing reviewer metadata results in explicit review exceptions. An exact metadata match is `CANDIDATE_CORRELATED_HOLD`, not cryptographic verification.
2. **Independent reviewer candidate intake:** Local-only JSON, maximum 4 KiB, exact eleven fields with bounded reference ID and fixed non-trust states. A candidate is not an authenticated independent reviewer. No free text, human identity, private signature, original binary, transport URL, password or customer/device data is accepted. Unknown fields, trust-positive claims, invalid identity and timestamps fail closed. The input is cleared on request and never uploaded.
3. **Fail-closed Shell status export:** Only after explicit owner acknowledgement, download sanitized JSON stating source revision, issue codes, `HOLD`, receiver transport `DISABLED`, zero authenticated receipts, zero messages and no publication. Neither raw reviewer claims nor custody digest is exported. The intended consumers are AI Data Platform (intelligence) and Comms Hub (operator coordination), but this screen contacts neither system.

## Exact metadata candidate schema

The separately reviewed JSON must contain only:

- `schema`: `rosevear.ai-hub.original-host-reviewer-candidate.v1`
- `sourceId`: `rosevear-ai-hub`
- `sourceSha`: lowercase 40-character repository SHA matching the private packet
- `custodyDigestClaim`: lowercase 64-character claimed SHA-256 matching the private packet
- `reviewerReference`: opaque uppercase code of 4–64 characters (`A-Z`, digits, `_`, `-`); **not a person's name**
- `reviewedAtUtc`: UTC ISO timestamp with milliseconds, following packet creation
- `evidenceOrigin`: `OWNER_SUPPLIED_METADATA_ONLY`
- `independentIdentityState`, `signatureState`, `originalHostState`, `ownerConsentState`: **all** `NOT_VERIFIED`

This is a candidate *claim format*, never a format for an actual signed original receipt. The original reviewed bytes and the separate protected signer/witness evidence must remain outside ChatGPT/browser intake until a separately approved trusted workflow exists.

## Owner walkthrough

1. On the original Windows machine, export the metadata-only Build 297 packet if we already have a valid supervised local review. Choose **Open Build 299 private provenance review**; the private intake remains unmounted until selected. Paste this private packet and an independently supplied sanitized reviewer candidate, if one truly exists. Do not fabricate a reviewer or generate a candidate to clear a gate.
2. Review source SHA, digest mismatch, chronology, age and the permanent `ORIGINAL_PROOF_UNVERIFIED` exception. An exact correlation is still HOLD.
3. Explicitly acknowledge the output limitations and optionally download the private Shell HOLD status for later owner review. No receiver, account, Windows process or source registry is changed.
4. A future authorized reviewer must separately prove original installed Windows identity, issuer/signer and independent witness, signed owner consent, cryptographic receipt and replay safety before the Shell may treat any result as trusted.

No database migrations, network sends, gateway GET, device actions, source-key enrollment or production connectivity are introduced. GitHub CI verifies code only.

**Next proposed Build 300 — Original Windows Reviewer Decision Evidence Contract, Source Revision Recheck & Authorized Shell Intake Readiness.**

