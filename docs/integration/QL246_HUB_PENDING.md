# Rosevear AI Hub — QL-246 source-proof return (PENDING / DISCONNECTED)

**Target source:** `RosevearCreations/rosevear-ai-hub`

**Business:** `rosevear-ai-hub` · **Tenant:** `null` · **Environment:** `nonproduction`

**Source-proof state:** `PENDING` · **Owner authorization:** `NOT_GIVEN` · **Connection:** `DISCONNECTED`
**External gateway GET verified:** `false` · **Durable gateway audit verified:** `false` · **Owner identity verified:** `false`

This is the Hub's honest response to the six-app QL-246 handoff, not a signed acceptance proof or permission to connect. **Do not create/publish `docs/integration/ql246-source-proof.json` until every prerequisite is independently confirmed.** An unsigned JSON at that path would misleadingly imply acceptance. The source CI run, once available, proves source checks only.

## Blockers requiring independent action

1. No trusted private operator supplied a real one-time `np-...` `challenge_id` or authenticated SHA-256 of their challenge nonce.
2. No distinct Hub Ed25519 signing key is provisioned in the Hub's secret manager, and no real public SPKI fingerprint has been exchanged through a separately authenticated channel with the AI Data Platform operator. Never publish/reuse an app's private key.
3. None of the **seven external nonproduction denials** has been independently witnessed for QL-246: `nonce_replay_denied`, `stale_request_denied`, `cross_business_denied`, `cross_tenant_denied`, `revoked_key_denied`, `write_denied`, `dispatch_denied`. QL-245's local synthetic negative tests are **not** sufficient.
4. No real nonsecret `np-...` IDs for gateway audit, health GET, capabilities GET or registered key have been independently verified. They remain `null`, not fabricated values.
5. No independently reviewed public proof content, immutable source revision, exact CI run, detached Ed25519 signature, raw-bytes digest or pinned-key fingerprint can yet be returned as the QL-246 bundle.
6. No owner authorization, external gateway GET, durable gateway audit or owner identity witness exists. No device, camera, password, LAN, automation, or real-time business access may be inferred.

## Exact allowed Hub gateway scope, once separately provisioned

- HTTP methods: `GET` only.
- Paths: `/api/integration/v1/health` and `/api/integration/v1/capabilities` **in that order**; no records, customer/product/reference queries or writes.
- Current boundary: off by default, nonproduction-only, server-to-server authenticated health/capability metadata with fail-closed authorization, no local device actuation, camera playback, passwords or network exposure.
- Required signed payload identity: `schema_version=rosevear.integration.v1`, `source_system=rosevear-ai-hub`, `repository=RosevearCreations/rosevear-ai-hub`, `business_id=rosevear-ai-hub`, `tenant_id=null`, `environment=nonproduction`, `owner_authorization=NOT_GIVEN`, `connection_state=DISCONNECTED`, all three verification booleans `false`.

## Required correction to the QL-246 Git SHA rule

The draft currently requires the JSON's signed `source_revision` to **equal the commit SHA containing that same file**. Git commit hashes commit trees; embedding a commit hash inside one of its own tracked files changes the tree and thereby the containing commit's hash. This is a circular self-reference. The AI Data Platform verifier and six-app operators must agree on the following explicit correction before publishing:

1. Review, build and freeze an **immutable source-code commit** `S` containing the audited Hub code. The signed payload's `source_revision` is `S`.
2. With the independent challenge and external test evidence, build the signed envelope for `S` using the Hub-only secret-manager key. Publish its exact raw bytes in a **later proof-publication commit** `P`, and provide `P` as a separate immutable locator.
3. Independent operator fetches `P:docs/integration/ql246-source-proof.json` via HTTPS and verifies SHA-256 of raw file bytes, source tree and CI for `S`, a real out-of-band SPKI pin, signed challenge, nonce and expiry, exact canonical payload schema, signature, all observed negative tests and identity. Require `S` to be an audited immutable ancestor of `P` (or another explicitly reviewed immutable source); **do not compare `S == P`**.
4. Even a verified public QL-246 source proof produces only a signed-metadata **HOLD**. It does not authenticate a later gateway GET, grant owner consent, activate dispatch or release the Vault.

If the AI Data Platform strict assertion remains `S == P`, **return BLOCKED** and amend the cross-application contract; do not attempt to brute-force a self-referential SHA.

## Return checklist for the AI Data Platform operator

| Required item | Hub result |
| --- | --- |
| Exact GitHub repository slug | `RosevearCreations/rosevear-ai-hub` |
| Immutable code SHA and real GitHub Actions URL | Return only after Build 174 source CI succeeds; do not call this a QL-246 acceptance run |
| Immutable QL-246 proof-publication SHA | `PENDING` (requires contract correction and genuine proof) |
| Raw published JSON SHA-256 | `PENDING` (no public signed JSON) |
| Public Ed25519 SPKI fingerprint authenticated out of band | `PENDING` |
| Real private challenge ID and challenge nonce digest | `PENDING` |
| Seven independently witnessed negative gateway tests | `PENDING` — do not substitute local fixtures |
| Read-only GET and durable gateway receipts | `PENDING`; ID fields remain `null` |
| Owner authorization | `NOT_GIVEN`; field and reviewer acceptance remain HOLD |
| Hub private first-party password/document Vault | `0/6 verified · SECURITY HOLD` |

**Other five applications must independently publish their own proof using distinct key/pin/challenge/test evidence.** This Hub handoff cannot attest to their status. AI Data Platform must independently inspect and return a six-app signed-metadata-only HOLD before any separately authorized read-only pilot is considered.
