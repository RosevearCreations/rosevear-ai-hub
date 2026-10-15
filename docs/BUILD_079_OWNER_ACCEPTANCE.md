# Build 079 — Owner Reconciliation Exception Review, Backup Provenance and Safe LAN Acceptance

## Purpose
Close the gap between code promotion and operator-confirmed Windows operation without treating
GitHub CI, a healthy loopback PWA, or a matching database snapshot as proof of full recovery.

## Safe acceptance sequence
1. On the actual server, determine the current IPv4 on the private household adapter. Do
   **not** reuse a previous IP without checking. On 2026-10-15 the operator captured
   `192.168.68.74`; the historical Build 078 example used `192.168.68.78`.
2. Run `scripts/inspect-hub-lan.ps1 -LanIPv4 "<current IPv4>"`. Record:
   `address_on_host`, `hub_api_loopback_healthy`, `built_pwa_on_api`,
   `vite_loopback_only`, `caddy_binary_present`,
   `lan_https_listener_present`, `private_firewall_rule_present`.
3. Treat a missing `lan_https_listener_present` as **HOLD** even if the web
   application and manifest both return HTTP 200 on `127.0.0.1:8765`.
   A Caddy executable present on disk is not a running gateway.
4. Review `scripts/configure-lan-https.ps1` in its non-mutating mode
   using the correct IPv4 and explicitly reviewed, narrowly scoped LAN client CIDRs.
   Enabling requires the owner's authorization and elevated PowerShell on the server.
   No automated build may enable firewall rules, bind backend/Vite publicly,
   or override certificate warnings. Never open router forwarding or Tailscale Funnel.
5. If explicitly enabled, verify the HTTPS listener **and** private firewall scope,
   then test from an authorized client after installing and trusting the local Caddy CA.
   Verify authenticated app access without leaking tokens. Keep LAN acceptance HOLD
   until that client-side test succeeds.
6. Inspect `GET /api/v1/camera-import-reconciliation` as the authenticated owner.
   If its state is HOLD, record its explicit exception reasons. Fix evidence mismatch
   through a separately reviewed procedure; do not modify or backdate an acceptance
   ledger to make a check pass.
7. For backup provenance, retain the backup creation time, encryption format/key
   availability **as operator-held evidence**, source host, source schema, retention
   location and isolated recovery provenance. Do not commit secrets, camera URLs,
   decrypted data, private backup paths or hashes to GitHub.
8. Run `scripts/hub_camera_recovery_verify.py` only against a separately recovered
   offline SQLite file, never the live file as both operands. `EVIDENCE_MATCH` merely
   proves a content comparison for selected tables at that moment.
9. Record separately whether Home Assistant, MQTT, Ollama, go2rtc and camera streams
   have been checked on the actual Windows machine. Unknown is not GREEN.

## Release gates
- **CODE GREEN**: feature reviewed into dev then main, required CI passes on dev, PR
  and independent main push, with head revisions reconciled.
- **LOCAL HOLD** until the Windows host has installed the exact release and the
  owner has independently reviewed the gateway, camera exceptions, provenance,
  client certificate trust and services. No automatic completion based on GitHub.
- Safety: all triage is read-only by default; no automatic camera activation,
  firewall changes, backup restore, secrets disclosure or service restart.

## Observed operator evidence (2026-10-15)
- Current server IPv4: `192.168.68.74`.
- Caddy installed: true.
- Built Hub index and web manifest on `127.0.0.1:8765`: HTTP 200.
- HTTPS port 8443: **no listening result shown**. Status unverified / HOLD.
- Screenshot does not demonstrate external certificate trust or camera acceptance.

## Next proposed
Build 080 — Operator-Gated Reconciliation Closeout and Reboot-Persistent Private Gateway.
