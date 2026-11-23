# Build 381 — Resilient Windows Boot, Network Sequencing & Local Recovery

**GitHub source target: dev/main GREEN after protected CI; original Windows HOST FIELD_HOLD until a real owner-witnessed reboot.**

## Source contract and architecture

Build 356 already introduced the only enrolled original-VM, pinned Ollama and
Hub/Caddy guarded boot chain. Build 357 exposed a task-identity mismatch
requiring independent original-host repair/verification, and Build 210
documented that a responding API is not evidence of a pre-login recovery.

Build 381 **does not** add a duplicate startup task or reconfigure Windows.
Instead it adds a reproducible diagnostic and recovery-dependency contract:

- `scripts/inspect-boot-sequence381.ps1 -Phase Before|After` is a read-only,
  explicitly invoked script for the **original Windows host**. It reads
  Windows OS boot timestamp, two exact existing unattended Task Scheduler
  identities (presence, enabled state and successful run after current boot),
  Build356 **CheckOnly** original pinned VirtualBox EFI guest evidence,
  Tailscale service and fixed loopback HTTP GET status for Ollama
  `127.0.0.1:11434/api/version`, Hub API `127.0.0.1:8765/health`,
  web `127.0.0.1:5173/`, and go2rtc `127.0.0.1:1984/api`.
  Only a local port-8443 listener is checked for Caddy; **TCP does not prove
  Caddy identity, TLS, certificate validity or external reachability**.
- MQTT inside Home Assistant, actual DHCP private IP reservation, private
  HTTPS and a second-device pre-login witness are always explicitly
  **UNVERIFIED**: there are no guessed HA credentials, network scans,
  router writes, cloud requests or fabricated test receipts.
- The output is one compact structured JSON observation with **no account,
  task command, credential, password, path, IP, detailed log, certificate or
  source-document data**. It is UNSIGNED: not independent evidence.
- Owner-only API `GET /api/v1/system/boot-sequence-381/contract` and
  `POST /classify` accept a strict fixed JSON schema; arbitrary extra
  fields, forged independent-witness flags and action claims are rejected.
  Timestamps must be timezone-aware and sane. Reports older than 24 hours
  are explicitly STALE/HOLD; a new OS boot timestamp is distinguished from
  independent reboot certification.
- New owner-only **Boot Recovery** UI imports a before/after observation
  in temporary browser session state, shows causal stage dependencies and
  the safe existing manual recovery/review step for each held stage.
  No report is persisted, sent to other Master apps or converted into a
  background Windows task.
- 11 checked stages: original pinned VM → Home Assistant MQTT add-on;
  Tailscale; Ollama; Hub API → web; go2rtc; Hub API+web → Caddy listener;
  DHCP reservation; Caddy → authenticated private HTTPS;
  TLS+DHCP → independent off-device pre-login witness.
  A reported healthy downstream stage remains DEPENDENCY_HOLD when any
  prerequisite is not observed.
- The classification **always** returns FIELD_HOLD, production original
  host GREEN=false, taskIdentityVerified=false, remoteWitness=false,
  unattendedRecoveryCertified=false. It never performs an automatic
  restart, Task Scheduler mutation, VM start, firewall/router edit,
  secret read, Home Assistant device action or radio/MQTT publish.

## Safe local owner workflow

Use the existing nonduplicated `C:\Users\ree\rosevearaihub` checkout
after verifying `git status --short --branch` and
`git pull --ff-only origin main` when safe. Do **not** reset/clean or
overwrite original private configuration. Ensure a **restorable and
off-machine** Hub database backup and separate original VirtualBox
Home Assistant backup before any maintenance.

**Before** owner-supervised reboot, on the original Windows PC:

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Inspect
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\boot-hub-unattended356.ps1 -CheckOnly
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-boot-sequence381.ps1 -Phase Before
~~~

Review and retain the sanitized JSON from the **third command locally**.
If a task identity, original VM pin, schema, backup, Caddy credential,
Ollama binary or release maintenance journal mismatches, stay on HOLD.
Do not install another task or blindly enable an unknown one.

Only after owner approval, conduct one supervised reboot with a trusted
**second** LAN/Tailscale device. Before logging in to Windows, independently
verify authenticated private HTTPS with correct TLS hostname/certificate,
Home Assistant guest and its authenticated MQTT add-on, original camera
playback, and Hub API/desktop availability. Confirm actual private DHCP
reservation from the authorized router configuration (read-only). No
scripted router/login/firewall modification.

After Windows sign-in, on the original Hub host:

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-boot-sequence381.ps1 -Phase After
~~~

In the owner-only **Boot Recovery** UI, paste the bounded before and after
JSON separately and select **Compare boot dependencies**. The two timestamps
can establish an owner-reported changed boot time but **not** a signed
independent pre-login witness. Verify exact task identity using the earlier
357 inspector and compare per-task LastRunTime after OS boot; task result
zero is not a guarantee that anything actually recovered. Separately keep
a real authorized off-device witness with time, device, authenticated TLS
and boot/sign-in chronology **outside this local unsigned classifier**.

## Recovery / rollback

- Stage HOLD means inspect only the existing provisioned component; use
  the existing guarded Build356 boot/Hub recovery and verified rollback
  flow if individually owner-approved. A bad listener must not trigger
  a duplicate process, loss of the original VM, or automatic DB migration.
- Preserve disabled legacy `Rosevear AI Server Startup`; do not revive it.
  Do not activate or enroll AI Data Platform/Comms peer workers, QL-340C
  private TEST receiver, unapproved MQTT broker or radio integrations.
- Source rollback reverts the new owner API, screen and read-only script;
  it makes **no data migrations**, deletes no owner receipts and changes no
  Windows tasks, network settings or installed services.
- Original Windows FIELD GREEN requires independent verified task identity,
  actual unattended recovery **before login**, separate restore-ready
  backups, validated DHCP/TLS and off-device witnessed HA, MQTT, Ollama,
  camera, Hub API/web and Caddy services. GitHub CI alone cannot provide it.

## Protected tests

- Python regression: owner-only contract, unauthenticated/household denial,
  fixed 11-stage dependency graph, missing prerequisites, stale/future/
  inverted/false-host reports, strict rejection of extra/trust-escalating
  fields, and immutable FIELD_HOLD.
- Web regression: bounded JSON parser, invalid report rejection, explicit
  owner submit only, no process or network-mutation request.
- Windows CI: PowerShell parser AST, fail-closed forbidden command list,
  fixed loopback-only probes and hardcoded false trust flags.
- Existing backend, web, desktop-windows, backup-windows,
  docs-foundation and CI-budget jobs must all be GREEN on the exact
  dev and independent-main PR heads; field acceptance is separate.

## Next planned work

**Build 382 — Zero-Trust Security, Secrets & Independent Restore.**
Six numbered builds (382–387) remain, plus deferred radio/MQTT
bridge provenance work.

Sources: docs/BUILD_356_QL465_UNATTENDED_WINDOWS_BOOT.md,
docs/BUILD_357_QL466_ORIGINAL_HOST_REBOOT_AND_MASTER_ENROLLMENT.md,
docs/BUILD-210-WINDOWS-STARTUP-DEPENDENCIES.md,
https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/,
https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection
