# Build 080 — Operator-Gated Reconciliation Closeout and Reboot-Persistent Private Gateway

## Prerequisites
Build 079 is still a draft. Do not merge this descendant branch into dev/main until
079 has passed its own review, independent CI, local owner acceptance and merge gates.

## Implementation in this branch
`scripts/recover-lan-https.ps1` is an opt-in, fail-closed gateway recovery command.
It reuses existing owner-approved Caddy configuration and private firewall restrictions;
it will not change the server IP, firewall, backend/Vite exposure, Windows services,
Caddy trust store, camera state, or backup data. `-CheckOnly` verifies prerequisites
without starting Caddy. A normal run may start Caddy only after the checks pass.

## Persistent startup design — implemented, not installed

- `scripts/install-hub-lan-startup-task.ps1` registers an exact-identity, opt-in
  Windows scheduled task with `-Install` and removes only that matching task with
  `-Remove`. No argument means status inspection only. Requires elevated PowerShell.
- `scripts/start-hub-lan-gateway.ps1` waits a bounded time for API, index and
  PWA manifest readiness, then invokes `recover-lan-https.ps1` without altering
  Hub backend, Home Assistant, MQTT, Ollama, go2rtc or camera services.
- `scripts/recover-lan-https.ps1` only starts previously authorized Caddy with
  current saved LAN address and matching private firewall rule. If the IP changes,
  firewall broadens, certificate/process ownership is wrong, or backend is unavailable,
  recovery stops with HOLD instead of guessing a fix.
- **Important:** This is an *at-user-logon* task, not a pre-login Windows service.
  Reserve the server LAN address in the router's DHCP settings for reliable access.
- The operator must review `-CheckOnly` first, then explicitly install the task,
  and verify sign-out/sign-in recovery and client certificate trust locally.
  Do not force an unattended reboot as part of GitHub CI.

## Required acceptance before GREEN
- CI/PowerShell syntax and fake-environment tests for missing/changed IP, disabled
  firewall, wrong firewall program or port, port collision, missing PWA and idempotence
- Build 079 dev/main promotion independently verified
- Build 080 dev CI, main PR CI, independent main push CI
- Installed exact commit on Windows host, owner-confirmed reboot recovery
- Client PC TLS trust and authenticated access, camera reconciliation and isolated backup
  provenance individually reviewed
- Do not use a successful HTTP 200 response alone as proof of these checks

## Operator evidence
On October 15, the user confirmed private HTTPS connectivity from the client PC
after correcting old IP `192.168.68.78` to `192.168.68.74`.
This does not yet establish reboot persistence.

## Local Windows operator verification (only after this release is installed)

1. From the repository directory, inspect the task without changing it:
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-lan-startup-task.ps1`.
2. Check existing gateway authorization and runtime without starting Caddy:
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\recover-lan-https.ps1 -CheckOnly`.
3. After reviewing task identity, optionally install from **elevated** PowerShell:
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-lan-startup-task.ps1 -Install`.
4. Verify exactly one named task, then test sign-out/sign-in only at a convenient time.
   Test the client browser, TLS trust and authenticated sign-in again. Do not force reboot.
5. To remove only this exact task (not the running gateway or other services):
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-lan-startup-task.ps1 -Remove`.

These commands are instructions, not actions automatically performed by GitHub CI.
