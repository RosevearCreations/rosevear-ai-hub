# Build 081 — Deferred Reboot Acceptance & Private Gateway Continuity Diagnostics

## Why this build is next
Build 080's production code, LAN connectivity, local sign-in task, and client certificate
trust were confirmed separately. The operator cannot reboot the Windows server yet.
That is not a reason to block further non-disruptive development, but **a successful
manually started task is not evidence that it will launch after a server reboot**.

## Implementation
- `scripts/HubGatewayEvidence.psm1` is a pure, typed, fail-closed evidence classifier.
- `scripts/inspect-hub-reboot-readiness.ps1 -LanIPv4 "<server-private-IP>"`
  inspects the registered task action/owner/logon trigger, last task result,
  loopback Hub health, built PWA, owned Caddy HTTPS listener and restricted firewall.
  It changes nothing and never prints certificate secrets, credentials or camera URLs.
- `scripts/test-hub-reboot-readiness.ps1` tests all-pass, eight single-failure cases,
  missing/invalid evidence, PowerShell syntax and a read-only command allowlist.
- CI runs those tests on Windows before allowing a build promotion.

## Acceptance semantics
- `READY_FOR_SUPERVISED_REBOOT_TEST` means **only** the checked prerequisites are
  ready to be tested; it never means automatic recovery has been proven.
- `HOLD` means one or more evidence checks failed; do not restart all services to
  satisfy it. Investigate the reported failing boolean(s) on the existing host.
- Regardless of success, `reboot_persistence=PENDING_SUPERVISED_SERVER_REBOOT`,
  `task_automatic_launch=NOT_PROVEN_BY_LAST_RUN`, and
  `client_tls_trust=SEPARATE_CLIENT_CONFIRMATION`.
- Separate owner camera reconciliation and isolated backup provenance checks
  remain independent. Build 081 introduces no schema migrations.

## Later, when the owner chooses to reboot
Before a planned restart, preserve current work and ensure the Home Assistant VM and
other services can be shut down gracefully. Do not reboot for this build or CI.
After server sign-in, run the inspector, review the scheduled task history, confirm
HTTPS access and certificate trust from the authorized client, and separately verify
Home Assistant, MQTT, Ollama and cameras. Capture explicit operator acceptance
and only then close the deferred reboot gate.

## Release gates
- Five Windows/backend/web/docs/backup PR CI lanes on `dev`, isolated `main`
  candidate PR and post-merge push.
- No automatic modification of Caddy, firewall, Windows tasks, VM, databases,
  camera streams or certificate trust.
- **CODE GREEN** and **LOCAL REBOOT ACCEPTANCE PENDING** may coexist.
- Rollback: remove these new read-only files and the Windows CI invocation in a
  normal reviewed commit. No local Windows task installation is required.

## Next build
Build 082 — scope to be confirmed from the roadmap after Build 081 promotion.
