# Build 117 — Post-Reboot Home, Workshop & Camera Acceptance Runbook

## Purpose and source-versus-installation boundary

Build 117 adds an **operator-supervised, read-only post-reboot comparison** to
**System → Post-reboot acceptance runbook**. It records temporary snapshots of
authenticated Home Assistant entity identities, registered Hub camera UUIDs,
five service states and the installed Hub version. It guides owner checks of
the *existing* Windows boot task, original VirtualBox Home Assistant VM, MQTT,
Ollama, authorized private HTTPS client and physical moving camera video.

GitHub source CI may be GREEN independently. Neither this feature nor CI proves
the latest code was installed on the Windows server, that the VM starts after
a power outage, or that a camera's actual video works. Such checks remain an
owner-supervised **FIELD HOLD** until separately observed and recorded.

## Before doing anything on Windows

1. Confirm a tested, recoverable Hub backup and a *separate* Home Assistant VM
   backup exist before considering any manual reboot. Do **not** restore or
   overwrite databases just to complete the runbook. Windows Hub backups do
   not automatically protect the HA VM, camera configurations, MQTT data or
   private TLS certificate authority.
2. Open the installed Hub **System** page. If **Post-reboot acceptance runbook**
   is absent, the new frontend has not yet been installed; GitHub GREEN does not
   change the existing client automatically.
3. Review existing Windows task history in an ordinary PowerShell console. The
   named task should be **Rosevear AI Server Startup**; don't create or modify
   it just because a read-only check reports a HOLD:

   ```powershell
   Get-ScheduledTask -TaskName 'Rosevear AI Server Startup' | Select-Object TaskName, State
   Get-ScheduledTaskInfo -TaskName 'Rosevear AI Server Startup' | Select-Object LastRunTime, LastTaskResult, NextRunTime
   ```

4. In the installed, trusted Hub checkout, the existing diagnostics can be run
   in ordinary PowerShell **without starting any services**:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-reboot-readiness.ps1
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-startup-readiness.ps1
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-ha-mqtt-readiness.ps1
   ```

   These scripts report classifications, not automatic fixes. If a script is
   not installed in the actual Windows checkout, stop that check; do not
   download an unverified script from a message.

## Supervised before-and-after procedure

1. Open **System → Post-reboot acceptance runbook**. Expand the circled **i**
   for in-product help; select **1 · Capture before reboot**. The snapshot is
   gathered only on button click, from existing read-only Hub GET endpoints.
2. Click **Show private baseline / import**, copy the JSON to a private local
   location under the owner's control and close it. Do not put it in GitHub,
   help tickets or chat: exact camera IDs and HA entity IDs reveal household
   inventory. The JSON intentionally has **no secrets, IPs, raw errors, RTSP
   URLs or MQTT topics**. It is **session-only** and is not saved by the Hub;
   a browser restart clears the temporary copy.
3. If we **independently decide** a Windows restart is appropriate, perform it
   using our normal operator-approved procedure. Build 117 has **no reboot,
   repair, startup, discovery, credential, camera or control actions**.
4. After Windows boots, confirm this dependency sequence without launching
   duplicate tasks, VMs or processes:

   - **Original VirtualBox HA VM** — confirm the pre-existing VM and **EFI**
     configuration are intact, and the guest actually starts.
   - **Home Assistant and MQTT** — wait for HA readiness; confirm authenticated
     Hub **Devices** and **MQTT** pages. HA discovery isn't the same as a
     configured integration or a working household device.
   - **Ollama** — confirm its existing local service responds and there is an
     installed model available. Never assume the model is installed because
     the service says online.
   - **Hub API, login and Caddy TLS** — connect from the Windows host and from
     an *authorized* separate LAN/Tailscale client over the **existing private
     HTTPS route**, with valid trusted TLS and expected authentication.
   - **Private go2rtc and cameras** — inspect registered cameras, then
     deliberately open each required stream using Build 116's supervised
     private viewer. Check actual **moving video**. A healthy API or one frame
     is insufficient. Don't expose streams through public router forwarding.

5. Return to **System**, expand import, paste the saved baseline, choose
   **Validate and import baseline**. Then select **2 · Capture after manual
   reboot**. Imported files are strictly schema-validated. The UI does not
   accept copied generic configuration, passwords, API keys or URLs.
6. Compare exact IDs, not just counts. If an HA entity or registered camera
   is missing, newly added or has a changed identity, the comparison is HOLD.
   Expand differences and review **Devices / MQTT / Cameras** without creating
   or deleting anything automatically. A new authorized device added between
   snapshots intentionally forces review of that change.
7. The screen also HOLDS when snapshot requests fail, both inventories are
   empty, any required service is unverified/offline, Hub versions differ, or
   the after-capture timestamp does not follow the baseline. This is expected
   until there is real post-reboot evidence.
8. Only check the six manual confirmation boxes for observations we personally
   completed. **Session review ready** means matching temporary inventory
   evidence plus *self-attested* real checks. It **is not** a signed or
   persisted Windows acceptance receipt. A separate owner-approved field
   handoff is still required.

## Diagnostic meanings and privacy

| Screen state | What it actually means | Next safe step |
| --- | --- | --- |
| `matched` | Exact before/after IDs equal | Independently check device function and video |
| `changed` | Some IDs added or missing | Review named identities and correct integration manually if approved |
| `unverified` | Snapshot/inventory request absent or failed | Refresh authenticated read-only status; check HA/MQTT configuration |
| `unavailable` | Authenticated status says service is not available | Inspect existing host/VM, logs and local network before proposing any restart |
| `not_configured` | No configured integration reported | Owner reviews existing service and backup provenance; never auto-enrol |
| `Session review ready` | Transient inventory/service comparison and six self-reported checks passed | Record separate owner-supervised installed-host acceptance |

Temporary evidence contains only an ISO timestamp, sanitized Hub version,
allowlisted service states, HA entity IDs and camera endpoint UUIDs. No browser
storage, backend mutation, scheduled polling, RTSP probing, camera stream
changes, MQTT publications, device commands or Task Scheduler modifications are
performed. The feature makes **eight existing read-only API calls only when
the owner clicks Capture**. The client never sends a saved baseline to the
Hub server.

## Acceptance coverage

- Frontend TypeScript, unit tests and production build: required locally.
- Independent feature PR → `dev` PR checks and post-merge push checks: required.
- Independent promotion PR → `main` PR checks and post-merge push checks:
  required for **source Production CI GREEN**.
- Windows installer/adoption, unattended VM startup, MQTT authentication,
  installed local Ollama model, actual HTTPS/Tailscale client, registered
  camera streams, household equipment controls and disaster recovery:
  **owner-observed field checks; not proven by repository CI**.
- No credential keeper/vault implementation is part of Build 117. Separate
  security-gated Builds 119–122 remain queued.

Next queued: **Build 118 — Device & Camera Field Recovery Acceptance Summary**.
