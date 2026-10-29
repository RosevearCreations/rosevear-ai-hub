# QL-256 — Rosevear AI Hub authentic source signer, custody and owner walkthrough

**Owner-safe technical handoff. No secret values, private identity documents, network coordinates or live device access. No TEST/relay permission is given by this document.**

## Verified return now (use in Comms Hub)

```text
App: Rosevear AI Hub
Repository: RosevearCreations/rosevear-ai-hub
Verified Build 182 main/source A: 9cac2ebcb386bec7dfcf2379acb0998c531c6aa1
Matching completed GREEN source CI: https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40878851316
Source A exact-commit proof path: HTTP 404
Signer provisioning decision: SIGNER_STATUS_UNKNOWN
Private signer key ID / approved secret store: NOT_VERIFIED
Custodian / independent witness / reviewer: NOT_ASSIGNED / PRIVATE_REVIEW_REQUIRED
Proof B + exact SHA-256 + independently trusted SPKI: NOT_AVAILABLE
Dedicated service account and rollback design: PROPOSAL ONLY
Owner TEST-only authorization: NOT_GIVEN
Relay installed or started: NO
Genuine gateway health/capabilities GET receipts: NOT_RUN
Real original seven denial cases: NOT_VERIFIED
Connection: DISCONNECTED / HOLD
Next concrete blocker: assign a real privately authenticated signer custodian and a DIFFERENT independent witness/reviewer; the private operator must decide whether an approved Ed25519 signer exists or must be provisioned.
```

This record is public **source/CI evidence plus a genuine missing-proof observation**. It is not an authenticated private signing receipt. When Build 183 is promoted to a newer main SHA, check that new SHA separately; do not mislabel the above A as the new B.

## What variable names exist and what values are known

This is a review of committed `.env.example`, **not the installed Windows computer**. Do not infer production status from template defaults.

| Existing setting | Public example value | Actual installed value |
| --- | --- | --- |
| `APP_NAME` | `Rosevear AI Hub` | Unknown |
| `APP_ENV` | `development` | Unknown |
| `APP_HOST` | `127.0.0.1` (loopback example only) | Unknown, do not disclose |
| `APP_PORT` | `8765` (example only) | Unknown |
| `AUTH_COOKIE_SECURE` | `false` for localhost; enable only behind trusted HTTPS when appropriate | Unknown |
| `AUTH_SESSION_HOURS` | `168` | Unknown |
| `MQTT_TLS` | `false` in local example (not permission for a relay) | Unknown |
| `MQTT_PORT` | `1883` in example only | Unknown |
| `OLLAMA_TIMEOUT_SECONDS` / `GO2RTC_TIMEOUT_SECONDS` | `5` / `5` | Unknown |

Existing **credential placeholder names** (empty in committed `.env.example`; runtime existence and values **not inspected**): `SECRET_ENCRYPTION_KEY`, `SECRET_ENCRYPTION_PREVIOUS_KEY`, `HOME_ASSISTANT_TOKEN`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `DEVILNDOVE_ADMIN_TOKEN`, `ROSIEDAZZLERS_STAFF_SESSION_TOKEN`, `YARDWORKERS_ACCESS_TOKEN`, `YARDWORKERS_ANON_KEY`. These belong to existing separate local/legacy connector functions; **never repurpose them as the QL-256 Ed25519 signer, six-app HMAC key, private runner, or future Windows service credential**. Additional read-only configuration defaults exist in `.env.example`; use the redacted CLI below. This review does not confirm whether any are active on the home PC.

### Proposed future QL-256 bindings (none operational yet)

| Binding name / artifact | Required value type | Current verified state |
| --- | --- | --- |
| App-specific `QL256_SIGNER_KEY_ID` | Opaque nonsecret key ID | NOT_AVAILABLE |
| `QL256_SIGNER_PUBLIC_SPKI_SHA256` | SHA-256 digest of genuine public Ed25519 SPKI | NOT_AVAILABLE / UNTRUSTED |
| `QL256_PRIVATE_REGISTRY_SNAPSHOT_SHA256` | Independently maintained trusted registry snapshot digest | NOT_AVAILABLE |
| `QL256_CUSTODY_RECEIPT_ID` | Opaque real custodian receipt ID | NOT_AVAILABLE |
| `QL256_WITNESS_RECEIPT_ID` | Different independent witness receipt ID | NOT_AVAILABLE |
| `QL256_OWNER_TEST_RECEIPT_ID` | Real separately authenticated future TEST-only decision | NOT_AVAILABLE |
| Nonproduction HMAC key ID | Distinct source + tenant + environment opaque ID | NOT_PROVISIONED / NOT_VERIFIED |
| Ed25519 private signing key | **Approved private key store only**, never `.env`, chat, source or CI logs | STATUS_UNKNOWN; no accessible value |
| Future relay service account/credential | Dedicated least-privilege Windows account and isolated OS secret store | NOT_CREATED / NOT_VERIFIED; proposal only |
| Future `HUB_RELAY_ENABLED` policy | Default disabled, later explicit separately authorized service decision | NOT_IMPLEMENTED; no live switch or service |

These binding names are a **proposed private operator contract**, not runtime environment variables consumed by Build 183. Adding them to GitHub or `.env.example` would not provision a real signer.

## Step-by-step actual owner and operator tasks

1. **Owner chooses people privately.** Identify one authorized signer custodian, a *different* independent witness and an independent reviewer; identify a separate Windows host operator if a future relay is proposed. Authenticate each person's role over an owner-approved channel independent of GitHub/chat. No roles have been established by this build. The owner must approve the storage method and the exact app/environment scope before generation/rotation.
2. **Trusted custodian checks the actual signer store.** The private operator returns exactly `SIGNER_NOT_PROVISIONED`, `SIGNER_EXISTS_CUSTODY_NOT_VERIFIED`, or `SIGNER_STATUS_UNKNOWN` based on a legitimate secret-manager check. If absent, provision a new app-specific nonproduction Ed25519 key in approved restricted private storage using documented ACLs, lifecycle, backup and rotation. Do not generate it in GitHub Actions, this ChatGPT workspace, a browser, or a shared six-app secret. Never send the private key or a home access path here.
3. **Public fingerprint and independent trust.** The custodian exports **only the public SPKI** through the private authenticated handoff; a reviewer can locally execute `npm run integration:ql256:hub:check -- --public-key-file <approved-public-PEM-path>` to derive a *candidate* 64-hex digest. A separate witness independently compares the genuine public SPKI to a trusted out-of-band registry and signs a fresh five-minute challenge, with distinct opaque custodian/witness receipt IDs and registry snapshot digest. A tool-computed fingerprint alone is **UNTRUSTED**. Do not put private registry contents or people/contact identifiers in the repo.
4. **Verify source A and matching CI.** The current verified A/CI pair is above. On any newer actual source revision, run `npm run integration:ql256:hub:check -- --public-get --source <full-40-hex-A>` on a trusted network-enabled machine. It contacts only public GitHub Actions and exact immutable proof path and fails closed on a mismatch/network error. The default command without `--public-get` makes **zero network requests** and safely inventories public example variable names. Public proof HTTP 404 is an honest blocker, not license to invent proof.
5. **Request TEST-only consent in a separately authenticated private process.** Specify one nonproduction business/tenant, source, authenticated protected transport, exactly `GET /api/integration/v1/health` and `GET /api/integration/v1/capabilities`, a future UTC window at most 30 minutes, expiry, independent reviewer, rollback and explicit no writes. The owner has **NOT GIVEN** this decision. Do not create HMAC credentials or run gateway GETs until the approved sequence is independently verified; a general request to build software is not this authorization.
6. **Only after authorized genuine Phase B**, test a protected private nonproduction runner with distinct least-privilege source/tenant HMAC credentials and canonical QL-243 signing. Independently witness seven target-side denials (replay, stale timestamp, wrong business, wrong tenant, revoked key, prohibited write, dispatch); collect original signed health/capability, audit-after-restart, revocation and rollback receipt IDs. Fixtures, dry runs or assertions without source-of-truth receipts do not count.
7. **Create authentic proof A→B.** Request a fresh ≤1-hour challenge after real tests; sign the canonical QL-248 `rosevear.integration.v1` payload referencing immutable source **A**, with honest original evidence and the true custodian-held Ed25519 key. Commit actual JSON to exactly `docs/integration/ql246-source-proof.json` in distinct descendant **B**, promote via dev/main and GREEN CI, retrieve immutable B HTTP 200, hash raw bytes, verify real signature, source CI and A→B ancestry, and independently compare trusted SPKI/witness registry outside GitHub. Reissue expired challenges; never backdate or forge seven denials.
8. **Separate pilot / 24-hour relay owner decision.** Even a completed authorized one-time TEST does not authorize live business integration, SMS, phone, payments, booking, Etsy publishing, gates, devices or a 24/7 home connector. Each needs its own later time-bound owner authorization and independent rollback evidence.

## Proposed Windows PC 24/7 mini-server (do not install)

- Confirm physical host uptime, patch/restore plan, explicit owner host authorization, service-account scope, dedicated versioned connector binary and private logs; never alter existing Hub startup tasks.
- Future transport: outbound-only authenticated TLS or owner-managed Tailscale/private transport, verified destination pin and per-source/tenant least-privilege credentials in separate OS secret store. **No public inbound port, router forwarding, household DNS, remote shell, camera, Blink, SkyBell, Nooie, littlelf, Netvue, Home Assistant, MQTT or password vault access.**
- Owner-reviewed proposal must specify disabled baseline, manual start/stop, 30–300-second bounded health checks, kill switch, revocation/rotation, event logs without secrets and return-to-disabled verification; rollback simulation from QL-254 is not installed rollback proof.
- Restore-to-disabled acceptance (future, independently witnessed): service not running, no auto-start task or scheduled restart, ephemeral credentials revoked, no active outbound connector sessions, original Windows firewall/startup baseline unchanged and source data never copied into household apps. Do **not** attempt this on the real PC now.

**Exact next blocker:** privately appoint the actual trusted signer custodian and separate witness/reviewer, choose approved key storage, then obtain the real operator's status decision and independently pinned Ed25519 public SPKI fingerprint. No public-GitHub code change can perform human identity/custody verification.
