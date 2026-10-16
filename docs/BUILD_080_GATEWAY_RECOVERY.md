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

## Persistent startup design (not yet enabled)
Implement and verify a separate user-logon scheduled-task installer with an exact-action
identity check, opt-in install/remove, secure process ownership verification, bounded
retry after backend readiness and no risk to the existing recovery tasks. Do not
alter the existing working `hub-recovery.ps1` or its operator stash.
Require local operator validation before installation.

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
