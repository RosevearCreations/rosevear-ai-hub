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
