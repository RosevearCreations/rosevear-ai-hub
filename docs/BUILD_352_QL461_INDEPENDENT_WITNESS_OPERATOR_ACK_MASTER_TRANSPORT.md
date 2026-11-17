# Rosevear AI Hub Build 352 / QL-461 — signed host receipts, operator ACK and three-Master event transport

## Design boundaries

Three separate Master applications remain independently releasable: **AI Data Platform** is the intended Server Shell, **Rosevear AI Hub** supplies original-host Windows automation, and **Rosevear Comms Hub** handles communications. YW and iCamp are Slave Shells and are not modified or deployed in this Build. Protocol 1.1 events are additive, and previously supported read-only protocol 1.0 peers remain unchanged.

**Build 352 is code, not proof of live installation.** GitHub CI tests cannot directly install or inspect `DESKTOP-AE894KC`, send real mail/SMS through Comms, witness a real unattended reboot, or certify any physical receiver as OFF. All receiver controls remain unavailable, authority remains denied, and the original incident remains OPEN.

### 1. Independently pinned original-host installation receipt

`server/src/rosevear_ai_hub/original_host_witness352.py` verifies a second **Ed25519 witness key distinct from the Build 349 owner key**, exact original-host identity and signed manifest digest. The receipt records current Windows Task Scheduler task name/principal/boot trigger/action, recent run timestamp and result, original Windows boot timestamp and capture time. Missing task, wrong script, stale/forged receipt, wrong manifest, wrong public key pin or wrong machine fail closed.

Run `python scripts/hub_witness_receipt352.py` **locally on the original Windows host**, with protected settings:

- `ROSEVEAR_QL458_MANIFEST_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PIN` from signed QL-458 enrollment
- `ROSEVEAR_QL461_WITNESS_PRIV_PATH`: locally protected **32-byte raw Ed25519 private key**, never uploaded to Git; this key must be different from the QL-458 owner key
- `ROSEVEAR_QL461_WITNESS_PUB_PATH`: separate **32-byte public key**, pinned by `ROSEVEAR_QL461_WITNESS_PUB_PIN`, SHA-256 hex
- `ROSEVEAR_QL461_RECEIPT_PATH`: protected local `.json` file with signed task and boot evidence; avoid cloud/synced directories and restrict Windows ACLs

The command inspects a specific read-only Task Scheduler entry, signs and stores the receipt after validating its task/run time. **Valid signed host-side receipt does not prove independent third-party presence, that the service started entirely automatically after reboot, or that all Master services recovered.** Those require witnessed physical reboot/task history plus an independent receipt ceremony.

### 2. Owner-approved signing keys for Master communication

Provision the **owner-signed** `rosevear.hub.signed-master-registry352.v1` JSON file under `ROSEVEAR_QL461_MASTER_REGISTRY_PATH`. Signed payload: schema, originalHost, manifestDigest, issuedAtMs, expiresAtMs, and keys (issuer, keyId, publicDerBase64, activeFromMs, activeUntilMs, revokedAtMs). Only original-host Hub signing key and manifest-allowed **ai-data-platform** and **rosevear-comms-hub** peer signing keys are admitted. Keys must be Ed25519; the registry is not a remote self-enrollment endpoint. Private keys are never placed in this registry.

### 3. Durable peer delivery vs operator ACK

Set `ROSEVEAR_QL461_OUTBOX_DB` to a protected local SQLite path, `ROSEVEAR_QL461_MASTER_SIGNING_KEY_PATH` to the local 32-byte raw Hub private signing key, `ROSEVEAR_QL461_MASTER_SIGNING_KEY_ID` to the enrolled keyId and `ROSEVEAR_QL460_EVENT_DB` to the existing verified local Master source event journal.

Use `python scripts/hub_master_event_delivery352.py --enqueue-issues` to sign and queue **only current validated source issue digests**, destined for Comms. The messageId is deterministic from manifest, recipient, event type and source digest, preventing redundant duplicate queue entries. This does **not** deliver a notification.

Configure `ROSEVEAR_QL461_TLS_CA`, `ROSEVEAR_QL461_TLS_CERT`, `ROSEVEAR_QL461_TLS_KEY` as protected client mTLS paths. With a separately enrolled and running Comms or AI Data Platform endpoint, `python scripts/hub_master_event_delivery352.py --deliver <messageId>` performs one bounded connection to the exact owner-manifest peer, verifies TLS chain/hostname/pinned leaf, transmits only the fixed 1.1 signed event envelope, and verifies a signed peer `RECEIVED` receipt with the same event ID and digest. The receiving apps must **independently implement** `POST /internal/rosevear/master/events/read-only/v1` as a non-command, receipt-only event sink. This Build does not deploy that route elsewhere. It does not automatically send or start services.

A distinct Comms-signed `ACKNOWLEDGED` receipt containing an **owner role and audit digest** can be locally imported with `python scripts/hub_master_event_delivery352.py --operator-ack <receipt.json> --message-id <id>`. It is only accepted **after** matching signed delivery ACK, with active enrolled peer key and an unmodified evidence reference. This is Comms’ signed *assertion* of an owner-level audit, **not independent evidence of a human reading the alert** without examining Comms’ underlying audit logs.

All three states are separate and persisted in the original-host ledger: `QUEUED`, `TRANSPORT_ACKED`, `OPERATOR_ACKED`. Reading the ledger cryptographically rechecks stored signed receipts, rather than trusting a database stage flag by itself. Duplicate signed events/ACKs fail closed. Signature keys can rotate independently; stale/unavailable key material makes archival status HOLD.

### 4. Owner-only dashboard

`GET /api/v1/system/server-shell-352` exposes local signed host receipt summary, peer-signed transport receipt counts, Comms-signed owner audit acknowledgement counts and explicit unverified flags. The unified Master Command Centre adds a QL-461 evidence screen. There are **no browser mutation endpoints**, physical controls, service starts/stops or remote command execution. Missing manifest, live endpoints, signed peer ACK or original Windows host means UNKNOWN/HOLD rather than a synthetic success.

## Manual acceptance still needed

The original PC must run the receipt command and demonstrate actual Task Scheduler startup across a real reboot, followed by independent review of the local receipt, live process/service state and durable event timestamps. Comms and AI Data Platform must separately adopt the event and ACK transport protocol and establish original-host mTLS enrollment. Only then can live message receipts be produced. Independently verify Comms operator identity/audit evidence before declaring a human acknowledged an issue.

**CI Production CODE GREEN is not equivalent to original Windows runtime GREEN or end-to-end operator delivery GREEN.** This Build never authorizes a physical receiver or silently reboots a server.

## Next queued: Build 353 / QL-462

Owner-approved original-host acceptance ceremony, signed post-reboot task execution corroboration, Comms verified inbox audit-linked ACK, cross-Master live mTLS pilot and key rotation/rollover operational dashboard.
