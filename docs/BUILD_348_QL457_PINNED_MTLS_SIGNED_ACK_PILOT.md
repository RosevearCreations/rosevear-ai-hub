# Rosevear AI Hub Build 348 / QL-457 — opt-in authenticated TLS pilot

## Released Hub-only source capabilities

- An **actual HTTPS client adapter** using CA chain validation, hostname verification, TLS 1.2+ and an **exact pinned leaf certificate SHA-256**. A locally enrolled client certificate is offered for mutual TLS. Redirects, unsigned ACKs and unknown routes fail closed.
- \`receive_mtls_pilot348\` accepts the peer certificate only from an actual server-side \`ssl.SSLSocket\` with \`CERT_REQUIRED\`, exact independently enrolled peer certificate pin, and the QL-456 Ed25519 issuer/audience/body-digest scope. It durably claims the inbound nonce before signing a recipient ACK.
- The recipient's short-lived Ed25519 **ACK binds the exact original message digest, recipient, sender, body digest and key generation**. \`PilotAckJournal348\` persists a one-time receipt transaction under SQLite WAL/FULL; replay cannot fabricate another delivered outcome.
- \`GET /api/v1/system/master-shell-348-transport\` is owner-only, no-store, **source readiness**. No public or owner POST/PUT/DELETE key enrollment, device command, or certificate upload route is mounted.
- This implements an **opt-in explicitly owner-approved pilot transport**, not a generic background dispatcher. Certificates, trusted peer key registry, TLS client-key files, trusted host and clock must be provisioned locally by the original owner. **No raw secrets are embedded in the repository or copied to peers.**
- A real cryptographic **loopback mutual-TLS server/client round trip** is exercised by automated source tests using separately issued CA/server/client certificates, a distinct source Ed25519 signer, a recipient signer and durable receipt journals. Tests include replay, unsupported protocol, unapproved route, forged socket, expiry and private payload rejection.
- Successful pilot code returns \`pilotMutualTLSVerified\`, \`pilotSignedAckVerified\`, and \`pilotReceiptPersisted\` only after the real socket round trip and protected journal write. It deliberately leaves general \`messageDelivered=false\` and \`crossAppConnectivityVerified=false\`, because a controlled CI loopback cannot establish an independent **live production** seven-app connection.

## Independent synchronization (AI Data Platform Build 408)

This is **Hub-only**. Protocol **1.1** additive capabilities do **not** require an AI Data Platform, YW or iCamp deployment (those applications have Vercel limits); the original **1.0** read-only adjacent governance capability remains available. A missing peer pin, incompatible protocol or absent remote endpoint holds **only the dependent capability**, never unrelated Hub operations. No seven-app synchronized release, peer database access, unapproved tenant sharing, or remote owner/T5 action.

Direct Devil n Dove/Rosie Dazzlers ↔ three-Master flows remain **read-only**, require separate consent/security checks and will not become automatically CONNECTED. iCamp and YW remain Slave Shells with their own visual themes; all three Masters retain their shared Master Instrument target.

## Production acceptance gate / original Windows host

1. Protect independent service signing keys; separately enroll genuine TLS CA, sender and recipient leaf pins and hostname. Set sender certificate+private-key files outside Git, with owner-only filesystem permissions, and retain rollback.
2. Supervise one approved non-production event over real peer transport, collecting **both** original sender message and independently verified recipient ACK. Persist the receipt with replay protection and cross-check source, audience, capability, nonce, expiry, TLS peer identity and both key IDs.
3. Only after the *actual deployed* sender/recipient endpoints, certificate custody and signed ACK receipt are witnessed can a specific peer pilot be marked verified. **Do not infer production link connectivity from CI GREEN or a test on localhost.**
4. Keep original receiver UNKNOWN/incident OPEN/activation false until **fresh original-host independent OFF attestation**; no pilot can authorize T5, close the incident or turn physical devices on.

The guarded transport adapter is **not wired to an always-on HTTP listener**: it is imported by trusted supervisor code or by controlled tests only. No production app secret enrollment, real peer handshake or owner-approved field pilot has been performed as part of this GitHub source release.

## Release

Production source requires the exact \`dev\` PR tests, isolated protected \`main\` candidate tests, and an independent postmerge exact-\`main\` push workflow, six independent checks for each. Main CODE GREEN does not equal real-world installation.

**Next proposed Build 349 / QL-458:** owner-approved first original-host remote peer enrollment, safe per-capability health dashboard, signed TLS pilot observations and independent acceptance evidence review. The peer applications can be upgraded separately and do not block local features.
