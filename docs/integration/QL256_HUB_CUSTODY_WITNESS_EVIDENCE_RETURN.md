# Rosevear AI Hub — QL-256 authentic private signer/custody return sheet (Build 184)

**Use only after independent owner-authorized private operator review.** The build provides preparation and candidate-intake tools, not a signer, person, approval, original proof, or a running connector.

## One concrete next action

The owner must **privately designate one genuine app-specific signer custodian, a different witness, and an independent reviewer**, approve their separately controlled key store and communication channel, and ask the custodian to check whether a real Rosevear AI Hub nonproduction Ed25519 signer already exists. This has not been done or independently attested in this build. Do not share the private key, identity documents, network paths, challenge contents or registry secrets with the AI assistant, GitHub or public exports.

If the key is absent, a trusted operator requests owner-approved provisioning/rotation in the approved private store with restricted access, revocation and recovery. If present, the custodian exports only the genuine **public** SPKI. The different witness must independently validate the registry pin out of band, supply distinct opaque custody/witness receipts and an authentic newly signed ≤5-minute public metadata envelope. The candidate form merely tracks untrusted receipt references; a local mathematical signature match does not authenticate the human signer. No owner consent or gateway test is inferred from a pin.

## Required order after private signer custody

1. Confirm original audited source SHA A and matching real completed GREEN Actions run whose `head_sha` is A. Build 183 source A `b992fdf6a30c62ad627f561c3808f39d4bf6f816` and run `40914482643` are a known historical candidate, not proof B.
2. Obtain a separately authenticated real owner **TEST-only** decision for one named nonproduction test business/tenant, future ≤30-minute UTC window and only `GET /api/integration/v1/health` and `GET /api/integration/v1/capabilities`. **Currently NOT GIVEN**; no gateway requests may run.
3. Under that specific approval and private trust, collect *original independently witnessed* authenticated health and capability receipts, seven target-side denial cases, tenant isolation, durable audit, revocation and rollback. No test fixture qualifies as this evidence.
4. With fresh challenge, sign the authentic canonical QL-248 `rosevear.integration.v1` source A payload using the genuine protected Ed25519 signer. Publish it only at `docs/integration/ql246-source-proof.json` in distinct descendant commit B (not A), promote B to dev/main and verify immutable raw B HTTP 200, byte SHA256, A→B ancestry, source CI and independently trusted pin. Never invent a self-signed original proof to satisfy a 404.
5. Separate later owner decision is needed for any persistent 24/7 Windows mini-server relay. The current proposal is outbound-only TLS/Tailscale, least-privilege dedicated Windows service account, per-app secrets, bounded checks and kill/revoke/rollback. **No service or startup task was installed or changed.** Home devices, vault, MQTT, cameras and Home Assistant are outside connector scope.

## Safe pasteback to Comms Hub

```text
App: Rosevear AI Hub
Repository: RosevearCreations/rosevear-ai-hub
Source A candidate: b992fdf6a30c62ad627f561c3808f39d4bf6f816
Matching source GREEN CI: https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40914482643
Signer provisioning decision: SIGNER_STATUS_UNKNOWN
Custodian / independent witness / reviewer: NOT_ASSIGNED / NOT_VERIFIED
Public SPKI and private registry custody pin: NOT_AVAILABLE / NOT_VERIFIED
Real witness public envelope / verified human origin: NOT_PROVIDED / NOT_VERIFIED
Proof B + exact raw SHA256: NOT_AVAILABLE
Owner TEST-only authorization: NOT_GIVEN
Genuine gateway health/capability GET receipts: NOT_RUN
Genuine original seven denial cases: NOT_VERIFIED
Dedicated service account / relay: PROPOSAL ONLY / NOT_INSTALLED
Connection: DISCONNECTED / HOLD
Next concrete blocker: privately assign a genuine signer custodian, separate witness and reviewer; authenticate roles and receive the operator's true signer status plus public SPKI through a trusted out-of-band registry process.
```

The completed normal application source deployment and a passing synthetic offline check are **not** private trust evidence or owner pilot approval. Never disclose an individual's identity, personal contact, signing private key, credential, home address/IP, private relay URL or original signed private challenge.
