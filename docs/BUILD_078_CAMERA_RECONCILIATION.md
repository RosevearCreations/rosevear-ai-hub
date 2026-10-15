# Build 078 — Camera Owner Acceptance Reconciliation & Isolated Recovery Evidence Review

## Scope
Build 078 adds **read-only** reconciliation of Build 077 manual owner evidence against
the installed camera inventory, import ledger and SQLite migration. The owner-only
endpoint `GET /api/v1/camera-import-reconciliation` reports:
- `HOLD` if no owner evidence, latest decision HOLD, schema not ready, camera or
  import counts changed, evidence migration changed, or saved inventory fingerprint
  no longer matches.
- `MANUAL_REVIEW_CURRENT` only if the **latest** acceptance manually confirmed all
  four checks and its saved snapshot, counts and migration are still current.

This is *not* automatic proof that the Windows host, HA, MQTT or cameras work.
The endpoint performs no service probes, mutations, credentials access, stream
activation, backup read, or restore operation. An owner-only panel in Cameras
displays explicit reasons and the review record identity.

## Isolated recovery evidence
`scripts/hub_camera_recovery_verify.py` now compares **canonical content**,
not just table counts, for camera models, approval ledger, import receipt ledger,
manual owner acceptance evidence and camera stream metadata (when present).
It reads both SQLite files read-only and never prints private camera records or
content hashes. It rejects passing the same file, including hard-linked aliases.
Missing evidence tables and differences are HOLD. Only schema 0022 matches.

PowerShell example **after recovering the backup into a separate restricted folder**:
```powershell
py scripts/hub_camera_recovery_verify.py --current "C:\path\to\hub.db" --recovered "C:\isolated\recovered.db"
```
`EVIDENCE_MATCH` means selected tables were equal at the time of comparison;
it is not proof that the encrypted backup is recoverable, restores were performed,
services are available, or cameras play. An older backup may legitimately differ
from an active database: that is a HOLD requiring operator review, not a reason
to overwrite the live DB. Never conduct a drill by replacing the live Hub DB.

## Client-PC connection after October power outage
The user observed `192.168.68.78:5173` refusing the connection. This is
expected: `apps/web/vite.config.ts` and the recovery command bind the
development preview to **127.0.0.1**, while Hub API on 8765 also stays loopback.
Do not expose Vite or the authenticated API on `0.0.0.0`, disable auth,
make inbound-wide firewall exceptions, or forward ports through the router.

The existing supported private-LAN option is
`scripts/configure-lan-https.ps1`, which uses a separately installed official
Caddy binary to reverse-proxy the **built PWA** through internal HTTPS.
The new `scripts/inspect-hub-lan.ps1` is read-only and indicates whether
Caddy, a built PWA on 8765, the private firewall rule, and a LAN HTTPS
listener are present. It does not open any network ports.

Run on the Windows server (PowerShell):
```powershell
& "C:\Users\Ree\rosevearaihub\scripts\inspect-hub-lan.ps1" -LanIPv4 "192.168.68.78"
```
If Caddy and the built PWA are present, review the existing opt-in
`configure-lan-https.ps1` dry-run for private `192.168.68.0/24` clients,
then explicitly enable from elevated PowerShell with least-privilege firewall
scoping. The intended remote address is `https://192.168.68.78:8443/`
**only after it is enabled**. Internal Caddy CA must be installed/trusted on
each authorized client. Never bypass browser certificate warnings.

If Caddy or the built PWA are absent, report the prerequisite instead of
pretending the LAN endpoint is live. No changes to the currently working
Windows Hub, Home Assistant, MQTT, Ollama or go2rtc are made from GitHub.

## Acceptance gates
- Tests: missing evidence, latest HOLD, accepted/current, changed inventory,
  identical counts with changed record content, hard-link rejection.
- Five GitHub CI lanes on each PR and on independent post-merge pushes.
- Local Windows migration, HA/MQTT and camera owner acceptance remain
  separately verifiable after installing the release.

## Next proposed
Build 079 — Owner Reconciliation Exception Review, Backup Provenance and Safe LAN Acceptance.
