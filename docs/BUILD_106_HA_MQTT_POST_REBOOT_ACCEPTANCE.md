# Build 106 — Home Assistant VM & MQTT Post-Reboot Dependency Acceptance

## Observed recovery and remaining gaps (October 21, 2026)

The operator recovered the existing VirtualBox Home Assistant guest after
correcting its EFI firmware setting. The Home Assistant UI became reachable at
`http://homeassistant.local` on **port 80**; Mosquitto responded on **1883**.
The authenticated Rosevear AI Hub then showed **Home Assistant online** and
**MQTT broker online**. LAN-client access, the Hub API, Ollama and the go2rtc
transport were separately observed working.

These are real owner-supplied runtime observations, **not** assertions from CI
or proof of unattended future boot. Build 105's guarded API/gateway recovery
does not start VirtualBox or automatically enroll smart-home devices.

The Home Assistant Devices page initially showed **11 system/service devices**
and **25 entities**, not the earlier broad household inventory. Its Integrations
page showed Epson ET-2800, iRobot Jeeves and Mopsy, Samsung TV, media devices and
an X20 UPnP device as **discovered but not configured**. The owner then added
Samsung Smart TV, and **two TV entities appeared in the Hub**. This establishes
one working synchronization path; it does not prove the remaining devices were
deleted or that the earlier list came from this same Home Assistant database.

The camera situation is separate: a healthy go2rtc API is not proof of saved
Hub camera registrations or working RTSP streams. Earlier camera-inventory
checks reported zero registrations; no new camera-stream acceptance has been
performed on the Windows server.

## What this build adds

- `scripts/inspect-hub-ha-mqtt-readiness.ps1` performs **read-only** checks of
  the named VirtualBox guest, reported EFI mode, running VM state, and TCP
  reachability for the already-approved *private* Home Assistant and broker
  addresses. Defaults reflect the observed deployment: VM `Home Assistant`,
  `homeassistant.local:80`, and `homeassistant.local:1883`.
- The inspector prints only fixed boolean classifications and reason codes.
  It does not echo VM configuration, network paths, credentials, or raw HTTP
  or MQTT messages. It rejects public IPs, non-local hostnames and IPv6.
- `HubHaMqttEvidence.psm1` fails closed, prioritizing VM installation/state/EFI
  before HA reachability and MQTT. Missing evidence, even a truthy string,
  cannot yield an accepted verdict.
- Even when all six checks pass, verdict is **READY_FOR_MANUAL_ACCEPTANCE**,
  never Production GREEN, authenticated connection verified, device inventory
  recovered, or camera stream functional. The script does not inspect task
  schedules or assert unattended VirtualBox boot.
- Windows CI tests PowerShell syntax, bounded verdict logic, privacy boundary
  and no-host-mutation requirements.

### Windows owner check (only when Build 106 is installed)

Open ordinary PowerShell in the existing Hub checkout:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-ha-mqtt-readiness.ps1
```

This must not be substituted for the existing Build 104/105 startup and
database-schema inspections. An `EFI_NOT_VERIFIED` result should trigger a
review of the *existing* VirtualBox VM's displayed configuration; never change
firmware, create a new VM or reinstall Home Assistant automatically. A TCP HOLD
should prompt the owner to check the existing guest boot, guest IP and broker
logs, not disable authentication or add a second MQTT broker.

## Manual dependency and inventory acceptance

1. **Protect data first.** Ensure a decryptable, off-machine Hub backup and a
   separate Home Assistant backup/emergency recovery key exist. The Hub backup
   does **not** contain the Home Assistant VM, Mosquitto data, Ollama models,
   private CA or physical camera configuration. Do not overwrite the live
   Home Assistant state when inspecting an older backup.
2. **VM.** Confirm the *original* VM is running with EFI and has completed HA
   startup. Inspect whether any existing owner-approved VirtualBox autostart
   task actually resumes the guest after Windows sign-in. The Hub's Windows
   startup and five-minute recovery tasks alone are insufficient.
3. **Authenticated integrations.** On the Hub's **Devices** and **MQTT** pages,
   refresh and require `Home Assistant online` and `MQTT broker online` using
   existing secrets. TCP checks above cannot replace API/token or MQTT client
   handshake. Zero subscriptions can be expected when nothing has subscribed;
   don't publish unapproved test commands to create activity.
4. **Device continuity.** Compare Home Assistant **Settings → Devices &
   services → Devices** with Hub **Devices**, recording number of devices and
   entities, and whether a *known non-sensitive test device* appears in both.
   Distinguish `Discovered` from `Configured` integrations; adding one
   integration can register multiple entities or bridge devices. Recover a
   prior configuration only after owner review of backup provenance and
   overwrite risks. **Do not automatically add every LAN discovery or enable
   safety-relevant controls**. The `Safe-control allow list` remains empty
   unless owner deliberately authorizes ordinary, low-risk controls.
5. **Cameras.** Compare **Cameras** registered rows and saved go2rtc streams to
   the previous known camera inventory and any encrypted isolated recovery
   evidence, using Build 078's read-only comparison where appropriate.
   Independently test an authorized live stream. Transport health and
   Home Assistant device count do not restore the Hub's separate camera
   database. Never mass-scan, auto-import, replace the live DB, or expose
   RTSP credentials while investigating.
6. **Clients.** Confirm local browser and previously trusted private HTTPS
   LAN client receive the same up-to-date inventory after manual refresh.
   Do not expose Vite/API broadly or bypass TLS warnings to force a client.

## CI, release and acceptance boundaries

- GitHub five-lane test/merge/push success certifies source promotion only.
- Protected promotion should pass `dev` PR checks, independent `dev` push,
  `main` PR checks, and independent post-merge `main` checks for the **exact**
  resulting tree. No existing release gate should be bypassed.
- This change does not start or stop VMs, alter Task Scheduler, migrate databases,
  change secrets, enroll devices, publish broker messages, probe cameras,
  configure firewalls, or install dependencies on the actual Windows host.
- Any live VM boot, authenticated MQTT, HA inventory, cameras and two-client
  acceptance **remains separately supervised** after source installation.

## Next queued

Build 107 — Device Inventory Provenance, Home Assistant Discovery Reconciliation
& Camera Registry Recovery Planning. Prioritize explaining which records come
from HA live state versus Hub SQLite camera records, and identifying recoverable
inventory without automatic enrollment, scanning or destructive restores.
