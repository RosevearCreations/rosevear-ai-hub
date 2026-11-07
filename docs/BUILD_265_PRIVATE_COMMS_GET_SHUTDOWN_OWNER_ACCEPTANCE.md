# Build 265 — first private Comms GET receipt, receiver shutdown witness and cross-device owner acceptance

## Honest starting position

The Build 264 release is green on `main`, but this is **source release status only**. The original Windows issuer, witnessed installed runtime, separate owner decisions, restricted Comms database enrollment, actual private receiver, real authenticated GET, nonce ledger and shutdown have not been independently proven in this workspace. Build 265 does **not** generate a false live response, activate a private receiver, use network credentials, bypass Windows recovery controls, or change any external database. A signed JSON file is mathematically checkable, but not by itself proof that a claimed event really happened.

The Build 265 evidence panel is nested under **System → Process Evidence → Build 264** so the five already-imported genuine original source and restart receipts, independent signer fingerprints and bounded private GET request can be reused. Build 265's three private receipt uploads can be reviewed once the original 263/264 files and fingerprints have been supplied. Build 265 **reverifies every earlier signature and window against the claimed historical GET time**; the earlier ten-minute request need not still be active to review its immutable past evidence. Retrospective validation does not authorize a new GET. The local review never calls a remote endpoint. The resulting connection status always remains `DISCONNECTED / HOLD` until authoritative external confirmation occurs.

## 1. Prepare a real, owner-supervised, single-use TEST on the private Comms host

Only the original authorized Comms private operator can perform this step. Independently confirm:

1. The actual Ree Windows release and post-restart process mapping, issuer and original owner are independently authenticated, and the original recovery task remains healthy.
2. Ree and Jack separately approved the exact nonproduction tenant/source, one `GET /api/integration/v1/health` **or** `GET /api/integration/v1/capabilities`, a nonce, a ten-minute maximum authorization, the private TLS identity and reviewed stop plan in the Build 264 request.
3. The genuine Comms receiver exists on its **private authenticated** host (not the static Comms website), and the original source identity is enrolled in the restricted Comms database. The private runner is scoped to exactly one GET and records immutable audit identity, response hash and nonce consumption in the receiver-side store. The operator verifies TLS and independently confirmed signer fingerprints outside a web form.
4. The private operator controls the receiver's shutdown/revocation action. No customer contacts, cameras, equipment or device actions are in scope. Never copy secrets, private keys, home-network routes, source customer payloads or full private receipt JSON to GitHub or chat.

If any prerequisite is missing: **STOP / HOLD**. Green CI is not permission to conduct a live network test. The historical [QL339B private receiver field handshake](integration/QL339B_WINDOWS_DEVICE_SIGNER_FIELD_HANDSHAKE.md) describes the original enrollment boundary. No private sender or server process is started by this build.

## 2. Genuine signed GET response receipt

After **one actual privately authorized GET**, retain the original signed receiver-side result, not a fabricated test fixture. Accepted schema: `rosevear-comms-first-private-get-265/v1`.

Required fields are `source_system=rosevear-ai-hub`, `target=rosevear-comms-hub`, `release_sha`, `signed_request_sha256`, `challenge_nonce`, `method=GET`, the exact authorized `path`, `http_status=200`, `response_body_sha256`, `audit_record_sha256`, `nonce_ledger_sha256`, `receiver_signer_pin_sha256`, `receiver_tls_pin_sha256`, `received_at`, and `receiver_operator` (raw Ed25519 public key and detached signature). The response body is **not** embedded or uploaded—only its SHA-256 digest. The receipt signs `canonicalPrivateGet265` as UTF-8. The request digest signs the whole original Build 264 request including its four role signatures using `canonicalSignedRequest265`.

The verifier rejects a different nonce, path, release, receiver pin, POST, 201/403 response, missing audit digest, replayed request with different full signatures, or a receipt outside the previously signed ten-minute TEST window. Browser checks alone cannot prove the nonce ledger was actually committed or that TLS was observed by an independent network witness.

## 3. Genuine shutdown, revocation and nonce-consumption witness

The private Comms operator stops the receiver and revokes the TEST credential within five minutes of the actual GET, then Jack independently checks the original receiver-OFF state within two minutes. Retain the real original server, audit and independent witness evidence. The signed schema `rosevear-comms-private-receiver-shutdown-265/v1` requires the exact `signed_request_sha256`, `get_receipt_sha256`, matching `nonce_ledger_sha256`, approved `stop_plan_sha256`, `receiver_state_after=OFF`, `credentials_state=REVOKED`, `nonce_state=CONSUMED`, `audit_state=DURABLE`, `shutdown_at`, `independent_checked_at`, plus distinct `receiver_operator` and `independent_witness` signatures over `canonicalShutdown265(shutdown, role)`.

A self-reported `OFF` string is not an independent readback. The operator and Jack must confirm actual shutdown and revoked credentials through their trusted original-host channels, and retain the real server-side database/revocation evidence. Nothing in Build 265 will stop or restart services automatically.

## 4. Ree and Jack — independent post-TEST acceptance

The schema `rosevear-comms-cross-device-owner-acceptance-265/v1` includes `release_sha`, the exact signed GET and shutdown SHA-256 digests, original `host_binding_candidate_sha256`, `signed_at`, `expires_at`, `decision=ACCEPT_SIGNED_TEST_EVIDENCE_FOR_REVIEW_ONLY`, `connection_state=DISCONNECTED / HOLD`, and distinct Ed25519 `owner` and `independent_witness` signatures over `canonicalAcceptance265` for their respective roles. Signing must follow Jack's independent receiver shutdown check, no more than thirty minutes later, with a maximum 24-hour review expiry.

In the Hub client, once the authentic Build 263/264 chain is mathematically reviewed, upload the three genuine Build 265 JSON files in the new panel and click **Verify signed private GET, shutdown and owners offline**. Valid signatures produce `SIGNED_GET_SHUTDOWN_AND_OWNER_CANDIDATE_EXTERNAL_HOLD`: a candidate for external acceptance only, **not** a CONNECTED transition. This historical review checks the earlier request was valid at the GET timestamp; it does not grant fresh permission to make a request now.

The next authoritative external step is independent readback of original receiver identity, TLS connection, source enrollment, durable GET audit + nonce ledger, actual revoked credential/receiver shutdown and the separate Ree/Jack decisions. Only then may a separately governed connection-state transition be evaluated. A missing original report, expired signature, contradictory timestamp, wrong signer, or changed digest is **HOLD**. No app/customer/device traffic is authorized.

## 5. Source checks and safe local handoff

- `node scripts/build-265-contract.test.mjs` verifies signatures are strictly checked, the private GET stays bounded, and all live Comms flags are forced false.
- `npm --workspace apps/web run test -- commsReceipt265.test.ts CommsReceipt265Panel.test.tsx --maxWorkers=1` runs **synthetic keys only** for success/forgery/replay/expiry paths. Test fixtures must never become production issuer or private receiver receipts.
- The protected GitHub pipeline runs the existing backend/web/Windows/recovery checks and Build 265 contract, preserving a read-only, no-network release boundary.

On Ree's original Windows machine, update the checkout with `git fetch origin main`, `git switch main`, `git pull --ff-only origin main`, preserving the untracked root `package-lock.json` and any local changes. The existing Build 264 observer remains read-only, and no extra PowerShell execution-policy changes or automatic restart are required for Build 265. GitHub deployment does not automatically install a new Windows process.
