# Rosevear AI Hub Build 354 / QL-463 — independently enrolled boot evidence, Master sink pilots, durable Comms source audit and certificate acceptance

## Scope and security

This release changes **Rosevear AI Hub only**. AI Data Platform remains the intended top-level Server Shell, and Comms Hub remains the independent communications Master. Their event-sink implementations and corresponding acknowledgements require **separate** source releases and genuine authenticated original-host tests. Slave Shells iCamp and YW, Devil n Dove and Rosie Dazzlers are not modified. Protocol 1.1 signed read-only events remain backward-compatible with existing 1.0 read-only peers; no seven-application lockstep release is needed.

**GitHub Production CODE GREEN cannot certify physical Windows operation, the original server's unattended reboot/recovery, a live peer response, independently confirmed owner reading, or any physical receiver OFF status.** No service reboot/start/stop, browser mutation, automatic certificate activation or receiver action exists in the QL-463 endpoints.

### Owner-enrolled independent Windows witness keys

Owner signs `rosevear.hub.owner-witness-enrollment354.v1` using the existing original-host **QL-458 owner Ed25519 key**. Exact canonical JSON payload must contain:

`schema, originalHost, manifestDigest, hostWitnessPin, reviewerPin, issuedAtMs, expiresAtMs, receiverActivationAuthorized`.

The two pins are SHA-256 hex of the **raw 32-byte public** host-witness and independent reviewer keys. All three pins (owner, witness, reviewer) must be different. Enrollment is scoped to `DESKTOP-AE894KC`, the accepted owner-signed manifest and a period not exceeding 30 days; receiver activation is always false. Put the signed envelope `{"payload": {...}, "signature": "<Ed25519 hex>"}` in a protected local file:

- `ROSEVEAR_QL463_WITNESS_ENROLL_PATH`: owner-signed independent witness/reviewer enrollment
- Existing `ROSEVEAR_QL461_WITNESS_PUB_PATH`, `ROSEVEAR_QL462_REVIEWER_PUB_PATH`, owner key and manifest remain required.

Build 354 checks owner enrollment **and** the Build 353 independently signed, two-boot review. Even a successful result is only an *owner-enrolled, reviewer-signed two-boot assertion*. Windows Task Scheduler history, actual automatic startup following a physical reboot, and 24-hour continuity still need an external, separately observed acceptance ceremony. Do not simulate or synthesize a receipt.

### Exact peer-sink pilots (AI Data Platform, Comms Hub)

The two recipient Masters must each independently deploy a read-only event sink, verify original Hub sender identity, deduplicate events, persist its own source audit and return a signed `RECEIVED` ACK. A separate signed QL-463 sink observation envelope uses schema `rosevear.master.signed-sink-pilot354.v1` and payload:

`schema, protocolVersion, issuer, audience, keyId, manifestDigest, messageId, messageDigest, deliveryAckDigest, sourceEvidenceDigest, tlsLeafPin, sinkDisposition, observedAtMs, expiresAtMs`.

The sink disposition is exactly `READ_ONLY_EVENT_RECORDED`; the sender audience is exactly `rosevear-ai-hub`. The recipient signing key must be independently enrolled in the QL-461 owner-signed registry, valid and unrevoked. Receiver certificate pin must match the **original owner manifest**, not a pin supplied by a recipient request. The original-host SQLite outbox must contain precisely the signed Hub event and signed recipient delivery ACK and show a received stage. These checks reject forged ACKs, wrong target, wrong certificate, stale/replayed source, or an unrecorded peer.

Save one protected package for each peer, with exactly `{"event": <signed Hub event envelope>, "deliveryAck": <signed peer ACK envelope>, "signedSink": <signed peer sink envelope>}`:

- `ROSEVEAR_QL463_AIDP_SINK_PACKAGE_PATH`
- `ROSEVEAR_QL463_COMMS_SINK_PACKAGE_PATH`

Use the existing original-host QL-462 opt-in CLI `python scripts/hub_master_event_delivery352.py --enqueue-pilot --pilot-audience ai-data-platform` and the analogous Comms target, followed by a deliberate `--deliver <messageId>`. Without real receiving endpoints and pinned TLS sessions, QL-463 must display **UNVERIFIED**. A stored signed historical sink is not proof that a peer is connected right now.

### Durable two-source Comms audit custody

The original Windows host may explicitly capture a Comms-signed source audit matching the same `operator.issue` event in the protected QL-460 **full hash-chained original-host journal** and an `OPERATOR_ACKED` stage in the QL-461 cryptographically checked outbox. The Comms audit must have the QL-462 exact message, owner allowlist ID, timestamp, actor role and source digest. The QL-463 record appends a uniquely keyed original message ID to a separate local SQLite hash chain. Replays or record tampering lead to HOLD; readback rechecks Comms signatures and the existing signed outbox.

`ROSEVEAR_QL463_SOURCE_AUDIT_DB` must refer to a protected local SQLite file path whose parent exists (do not use a shared/cloud folder). Use the existing exact `ROSEVEAR_QL462_OWNER_AUDIT_ID` and `ROSEVEAR_QL460_EVENT_DB`. Once the genuine source and Comms signed ACK are available, run locally:

`python scripts/hub_acceptance354.py --record-audit C:\\Protected\\comms-audit-package.json`

The package schema is QL-462 `{"event": ..., "operatorAck": ..., "signedAudit": ...}`. It is not an assertion by Hub that any person actually read the alert. Local hash chaining is **not third-party notarization**. An independent Comms owner-session audit must still be reviewed for final human-read acceptance.

### Master certificate rotation acceptance

This build **does not rotate TLS keys automatically**. Owner can sign a pending `rosevear.hub.owner-certificate-rotation354.v1` payload including exact `manifestDigest, peer, hostname, port, previousTlsLeafPin, candidateTlsLeafPin, issuedAtMs, expiresAtMs, activateAutomatically=false`, limited to 24 hours and either independently enrolled Master. Store in `ROSEVEAR_QL463_CERT_PLAN_PATH`. The candidate pin must differ from current original-host signed manifest pin.

To perform an **explicit real original-host mTLS probe** (without HTTP or remote actions), with protected existing `ROSEVEAR_QL461_TLS_CA`, `ROSEVEAR_QL461_TLS_CERT`, `ROSEVEAR_QL461_TLS_KEY`:

`python scripts/hub_acceptance354.py --probe-candidate ai-data-platform`

Or use `rosevear-comms-hub` for the other Master. The CLI checks owner signature/manifest/host/port/previous and candidate pins, completes a TLS server-validated and client-certificate-authenticated connection to exactly the enrolled destination, then hashes the actual presented leaf certificate. It prints a successful candidate handshake only if the candidate pin matches. **No certificate is deployed or activated**, and no peer-read-only event is sent. Any failed TLS probe stays HOLD. After a real successful probe, the owner must separately approve updated manifests, enroll the peer's new leaf and validate end-to-end signed ACK delivery before retiring old keys.

### Server Shell and CI

Owner-only no-cache `GET /api/v1/system/server-shell-354` combines original-host witness enrollment, prior QL-462 reboot review, original outbox-signed peer sink packages, durable Comms source audit and owner-signed candidate certificate plan. UI never initiates the CLI or network access; all evidence is missing = HOLD. Receiver UNKNOWN, original incident OPEN, activation DENIED.

`scripts/hub_acceptance354.py --inspect` reads local custody summary on the original host. `--record-audit` is the only database mutation; `--probe-candidate` is the only explicit network operation. These are **not** scheduled automatically. CI must pass six jobs for dev PR, isolated main candidate, and independent exact merged main push. **No simulated tests or receipts** may be promoted as physical acceptance.

**Next proposed Build 355 / QL-464 — Protected Windows Evidence Enrollment Automation, Peer-Side Signed Sink Contract Adoption Readiness, Certificate Rollover Witness Ledger & Cross-Master Incident Continuity Tests.**
