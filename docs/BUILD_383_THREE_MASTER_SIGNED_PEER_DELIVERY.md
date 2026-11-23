# Build 383 — Three-Master Actual Signed Peer Delivery

**Release scope:** original Windows Hub outbound source code and owner-supervised one-shot CLI. **No fake receipts, automatic worker, browser POST, or new receiver.** GitHub source GREEN is not runtime GREEN.

## What changed

- Adds `three_master_delivery383.py`: independently approved AI Data Platform and Comms peer identities; exact owner-signed Build349 manifest and Build352 Ed25519 registry; two distinct enrolled peer signing keys; fresh real original-host Build351 module observation bound into two separate Ed25519 master.health events.
- Requires **two separate pinned TLS peers**, literal RFC1918 or Tailscale IPv4 addresses, distinct remote certificate SHA-256 leaf pins, distinct private CA files and distinct client certificate identities; existing Build352 enforces TLS CA validation, SAN hostname, client mTLS, signed protocol 1.1 payload and remote signed ACK correlation, 5-second connection bounds and durable SQLite receipt recording.
- The Build383 one-shot sender queues two different replay-resistant event IDs and dials both **actual receiver endpoints** sequentially. It only accepts both if the existing journal cryptographically re-verifies both signed peer ACKs. One absent/failed ACK is `HOLD_PARTIAL_OR_MISSING_PEER_ACK` (even if the other succeeded). Existing durable receipts are never erased on partial failure.
- No operator ACK or live uptime is inferred from transport ACK. Previous history does not prove current peer health. The private Comms QL-340C receiver remains OFF unless independently authorized.

## Original-host field run, only after receivers and owner enrollment are ready

Run on the actual `DESKTOP-AE894KC` using the installed Python environment and `server/src` PYTHONPATH (as in Build352). Keep all paths and private keys protected outside Git, with owner-reviewed Windows ACLs.

Reuse: `ROSEVEAR_QL458_MANIFEST_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PIN`, `ROSEVEAR_QL461_MASTER_REGISTRY_PATH`, `ROSEVEAR_QL461_OUTBOX_DB`, `ROSEVEAR_QL460_EVENT_DB`, `ROSEVEAR_QL461_MASTER_SIGNING_KEY_PATH`, `ROSEVEAR_QL461_MASTER_SIGNING_KEY_ID`. Manifest must contain both independent destination pins, protocol 1.1, read-only capability, private literal IP and signed source registry; the event journal must contain a fresh original-Hub module-observed fact.

Add six **separately scoped** local protected file paths:

- `ROSEVEAR_383_AIDP_TLS_CA`, `ROSEVEAR_383_AIDP_TLS_CERT`, `ROSEVEAR_383_AIDP_TLS_KEY`
- `ROSEVEAR_383_COMMS_TLS_CA`, `ROSEVEAR_383_COMMS_TLS_CERT`, `ROSEVEAR_383_COMMS_TLS_KEY`

```powershell
$env:PYTHONPATH = (Resolve-Path .\server\src).Path
.\.venv\Scripts\python.exe .\scripts\hub_three_master_delivery383.py --preflight
# Only with independently approved, running receiver routes at both peers:
.\.venv\Scripts\python.exe .\scripts\hub_three_master_delivery383.py --deliver-once
.\.venv\Scripts\python.exe .\scripts\hub_three_master_delivery383.py --status
```

Neither the Hub GitHub connector nor CI has the actual host's private CA/signing keys or permission to enable Comms receiver QL-340C. Real field delivery remains HOLD until both peers independently expose the exact Build352 `POST /internal/rosevear/master/events/read-only/v1` signed receiver endpoint with owner-controlled consent. Do not switch to public URLs or turn off TLS pin/ACK verification.

## Field acceptance and rollback

Witness real Windows local event generation and exact installed commit; independently inspect the AI Data Platform and Comms receiver records; preserve a separately audited original-host two-message signed journal copy and signed receipts. Test stale, swapped, wrong-key, tampered, duplicate and partial ACK denials. Verify source-bound uptime by a separate observed on-host process/service ceremony, not by an old transport receipt. To roll back, stop using Build383 CLI, revert its source release with reviewed PR and retain the signed ledger (do not purge ACKs or deactivate unrelated services). No router/firewall, device, QL-340C, password or certificate mutation is performed by this build.

**Build 383 field status:** HOLD until independently witnessed delivery from the installed original host to both independently enrolled live receivers. **Next proposed: Build 384 — Seven-Application Governed Intake & Analytics.**
