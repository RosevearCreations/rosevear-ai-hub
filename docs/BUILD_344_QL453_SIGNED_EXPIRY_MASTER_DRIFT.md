# Build 344 / QL-453 — Signed exception follow-up, expiring OFF readback and three-Master handoff drift

Scope: source-only acceptance on original Windows host \`DESKTOP-AE894KC\`. The receiver remains physically UNKNOWN, the incident remains OPEN, the connection remains HOLD, and \`activationAuthorized=false\` / \`closureAuthorized=false\` regardless of synthetic test success.

## Evidence safeguards

- \`master_shell_followup344.py\` independently rechecks all original Build 343 / QL-452 evidence (including protected QL-450 + QL-451 lineage), signed original-host OFF/ON source, signed independent receiver witness, explicit isolation/lease/watchdog flags, monotonically increasing sequence and a **45-second maximum age**. Stale, future, signed ON or contradictory evidence remains HOLD and requires owner escalation. A valid historical OFF *never proves current physical OFF*.
- Signed original owner follow-up binds unique case and challenge, exact QL-451 receipt and witness digests, incident OPEN/HOLD and denies activation/closure. It distinguishes an open signed prior exception from ordinary history-continuity review.
- Three distinct pinned Ed25519 Master votes are chained in the canonical order \`rosevear-ai-hub\`, \`rosevear-comms-hub\`, \`ai-data-platform\` and must deny connection and incident closure. Wrong authority, revoked evidence, changed digest, missing vote or cross-Master drift becomes HOLD and requires escalation. No automatic outbound incident is posted.
- \`cross_app_security344.py\` defines a separately signed, 60-second-expiring, read-only seven-app governance envelope for **adjacent ordered hops only**, explicit role/scope, strict nonce/correlation and declared evidence digest. It rejects commands, tenant data, PII, connected status, out-of-order routing, expired evidence, duplicates if provided a previously-seen-ID set, and signature/key mismatch. Validation does not transmit a message or provide durable replay storage.
- Owner-only \`GET /api/v1/system/master-shell-344-followup\` is no-store, unauthenticated requests fail, and there are no POST/PUT/PATCH/DELETE controls. It reports NOT_VERIFIED until actual protected field signers and data are enrolled. The owner System panel exposes the six security levels and seven application order without unsafe controls.

## Six security levels to coordinate across all seven apps

| Tier | Intended trust | Boundaries |
|---|---|---|
| PUBLIC_READ | Public catalog/help/status | No customer records or administrative writes |
| USER_SCOPED | Authenticated end-user | User-owned records only |
| TENANT_SCOPED | Company/camp tenant operations | Tenant ID + role + resource ownership on every request |
| OPERATOR_SCOPED | Internal company/operator admin | Company-specific approvals and audit |
| MASTER_GOVERNANCE | AI Data, AI Hub, Comms Hub | Independently pinned signed metadata, replay/expiry checks; no implicit operational connectivity |
| ORIGINAL_HOST_OWNER_CEREMONY | Ree original host plus independent physical witness and owners | **Never** delegated through web API/event bus; explicit original physical OFF / closure ceremony required |

Production candidates must not collapse security tiers, share a private signer across apps, grant superuser roles transitively, or conflate source-green CI with real production access.

## Release and evidence limits

Feature PR -> dev 6/6 protected GREEN; isolated exact changes based on latest protected main -> production PR 6/6; protected main merge; independent exact-main push 6/6. No SSH to original host, fabricated real signer enrollment, new Cloudflare/Vercel secrets, or cross-app device commands. Source tests use synthetic Ed25519 identities and do **not** create a live Windows attestation or proof of working transport.

Cross-application source governance: [AI Data Platform issue #935](https://github.com/RosevearCreations/ai-data-platform/issues/935) and ordered companion threads from that issue. Common expansion queue and acceptance dimensions: \`docs/BUILD_QUEUE_345_356_MASTER_SECURITY_INTEGRATION.md\`.

**Next proposed Build 345 / QL-454:** Canonical Cross-Application Security Tier Enforcement, Verified Principal Scope & Tenant Boundary Policy-as-Code.
