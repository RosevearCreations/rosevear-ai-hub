# Rosevear Integration Contract v1 — AI Hub handoff

This project handoff follows the owner-provided **Rosevear Cross-Application Connection Plan v1**. It is a planning and security boundary document, **not** a live connector or production authorization. The AI Data Platform owns the Integration Gateway/control plane; Rosevear AI Hub retains authority over local devices, cameras, automations, and local service health.

## AI Hub's intended restricted contract

- `GET /api/integration/v1/health`: only application identity, version, contract version, environment and coarse connection status. Do not return device IDs, IPs, hostnames, camera names, secrets, customer data or household topology.
- `GET /api/integration/v1/capabilities`: only explicitly allowlisted, owner-enabled status capabilities (`device.status`, `camera.status`, `automation.status`, `local_agent.status`). Reports access rights; does **not** execute them.
- `POST /api/integration/v1/events`: future signed and idempotent event intake after gateway contract, authorization and audit ledger are tested. Starts disabled, no incoming events processed in Build 166.
- `POST /api/integration/v1/commands`: future separately reviewed owner-approved operation-specific flow only. `notification.request` and any automation remain disabled, not implicitly granted by health.

## Non-negotiable connection rules

1. AI Hub never receives another app's database credentials and never directly queries business databases. Devil n Dove, Rosie Dazzlers, Yard Workers, iCamp and Comms Hub continue to own their records.
2. Require per-application server-side signed authentication (with separate scoped credentials), verified request timestamp, tenant/business identity, exact capability allowlist, disabled-by-default switches, idempotency/replay rejection, rotation and revocation. No keys in browser JavaScript.
3. Return authenticated, bounded, redacted metadata only. Never infer cross-business identity from matching email, phone, name or address. Avoid any automatic camera playback, home automation, private MQTT publish, data export or security-Vault operation.
4. Log accepted/rejected operations with a trace identifier and non-sensitive audit receipt. Negative auth, replay, expired timestamp and cross-tenant tests are mandatory before any connector is enabled.
5. Owner control plane states: `DISCONNECTED`, `CONFIGURED`, `TESTING`, `CONNECTED`, `DEGRADED`, `HOLD`, `ERROR`, `REVOKED`; include last success/failure and exact reason. Turning a connection off must block subsequent transfers without changing local records.

## Implementation dependency

Wait for the AI Data Platform to publish and approve **Rosevear Integration Contract v1** and the shared SDK before implementing live endpoints. Stage health, capabilities and application identity first; no business/customer records or commands. The gateway must authorize any next capability and the owner must independently approve it. Build 166 does not activate any cross-application connection and does not change the Hub's existing physical field/Vault HOLD restrictions.

## Build 171 / QL-243 secure connection-test implementation status

The owner-provided 2026-10-27 QL-243 and revised QL-245 six-application handoffs supersede the earlier proposed `device.status`, `camera.status` and automation capability advertisements for this *first* nonproduction phase. Only the exact ordered scopes `read_health` and `read_capabilities` are advertised for the two read-only GET endpoints; **no callable device/status-read beyond these paths** is exposed. No events, commands, automations, camera feeds, local topology, Vault or business data.

Build 171 adds server-only, schema-hidden `GET /api/integration/v1/health` and `GET /api/integration/v1/capabilities`; Build 173 aligns the QL-245 response to `DISCONNECTED`, the two exact scopes, ordered paths and the required `np-...` key-ID format. These remain **off by default**, nonproduction only, and require exact twelve-line HMAC canonicalization, a 256-bit secret, timestamp ±300 seconds, 128-bit nonce, strict `source=ai-data-platform`, `destination=business=rosevear-ai-hub`, and `tenant=-`. SQLite atomically persists replay identifiers and a redacted accept/deny record. Wrong business, tenant, source, signature, stale time, revoked/rotated key, unknown route, query/body, and unsafe method are denied. No client-side secret. Responses are deliberately *not* presented as Ed25519-signed gateway receipts.

This is **only a scaffold for nonproduction testing**. Securely provision `ROSEVEAR_INTEGRATION_V1_ENABLED=1`, `ROSEVEAR_INTEGRATION_V1_KEY_ID`, `ROSEVEAR_INTEGRATION_V1_HMAC_KEY_B64` (32 bytes encoded, never a public repo file), `ROSEVEAR_INTEGRATION_V1_AUDIT_SQLITE` (a secure private persistent directory), `APP_ENV=nonproduction`, and a private TLS/egress-allowlisted origin **only after** separately approving a narrow test. `ROSEVEAR_INTEGRATION_V1_KEY_REVOKED=1` disables the current key. Rotate by revoking the old ID and provisioning a new key and ID through a trusted secret manager. Do not enable on the production Windows service.

**Still NOT IMPLEMENTED / not yet verified:** gateway-signed Ed25519 receipt canonical format, authenticated gateway audit ID lookup and durable gateway audit inspection, independently verified gateway/owner/witness public SPKI pins, owner witness challenge/attestation, independent end-to-end connection, owner read-only pilot decision. These are owned by the central gateway and require a shared canonical verifier and genuinely independent reviewer before a QL-243 connection report can be accepted. Do not invent key, receipt, audit, signer or CI IDs. Source GREEN is not nonproduction remote-test success, owner consent or installed Windows acceptance.

**Sanitized handoff status:** Application `rosevear-ai-hub`; source repository `RosevearCreations/rosevear-ai-hub`; paths `/api/integration/v1/{health,capabilities}`; key ID `NOT PROVISIONED`; signed receipts `NOT IMPLEMENTED`; audit receipt and independent witness `NOT IMPLEMENTED`; connection `DISCONNECTED / HOLD`; owner pilot `NOT AUTHORIZED`. The seven Build 173 QL-245 deny tests are synthetic regression evidence only, not externally observed original receipts. The six-source Ed25519 and assessor packet cannot be signed or independently verified without externally issued keys and pins. See `ROSEVEAR_INTEGRATION_V1_QL245_HUB_RESPONSE.md`; supply actual source commit and CI run after promotion and never put credentials, household data or live requests in a report.
