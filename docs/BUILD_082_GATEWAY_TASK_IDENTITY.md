# Build 082 — Gateway Task Identity Reconciliation & Diagnostic Accuracy

## Purpose

Build 081 was installed on the household Windows server and returned 7/8
checks: task present, last run success, logon trigger, firewall, Caddy owner,
backend and built PWA true, but `TaskOwned: False`. This is a **HOLD** pending
task identity inspection; it is not evidence the gateway itself failed.

Build 082 provides a sanitized reason code that distinguishes exact task
action/path, action count, and Windows principal identity. No task is rewritten
and no missing evidence is converted to success.

## Changes

- `scripts/HubTaskIdentityEvidence.ps1`: deterministic, read-only, fail-closed
  verdict. Exact `powershell.exe` and full fixed task arguments required.
- `scripts/inspect-hub-reboot-readiness.ps1`: checks the task principal by
  resolving the Windows account to its SID (or verifying an existing SID).
  Prints only a bounded reason enum, never usernames, SIDs, task arguments,
  configuration paths, certificate keys or credentials.
- `scripts/inspect-hub-lan.ps1`: replaces the read-only PowerShell automatic
  `$HOME` collision that formerly caused spurious PWA-not-ready results.
- Windows CI tests parse all affected scripts, forbid host-mutating commands,
  and exercise verified, absent, duplicate-action, wrong-executable,
  wrong-arguments, unresolved-principal, and mismatched-principal cases.

## Run on the Windows server (only after installation of Build 082)

From `C:\Users\Ree\rosevearaihub`:

```powershell
git pull --ff-only origin main
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\inspect-hub-reboot-readiness.ps1" -LanIPv4 "192.168.68.74"
```

Review **Task identity status**:

- `VERIFIED`: exact action and same Windows security principal; this is
  only local task identity evidence, **not** a successful reboot test.
- `ACTION_COUNT_MISMATCH`, `EXECUTABLE_MISMATCH`,
  `ARGUMENTS_MISMATCH`: Task Scheduler action differs; inspect manually
  and do not delete or overwrite the running task.
- `PRINCIPAL_UNRESOLVED`: Windows cannot establish the configured
  account's SID; no guessing based on a username.
- `PRINCIPAL_MISMATCH`: the configured task runs as a different identity
  than the inspecting user; do not transfer task ownership automatically.
- `TASK_ABSENT`: no matching task found.

If `HOLD` remains, preserve running Caddy/Hub processes, capture the reason
code (no credentials), and reconcile only with explicit owner approval.

## Security, migrations, rollback

No database/schema migration, certificate or firewall modification, new
network endpoint, task installation, service restart, background task or
Home Assistant/MQTT/camera operation. Windows account SIDs are used only
in memory for equality, not persisted or logged.

Rollback: revert the Build 082 reporter and policy changes through a
reviewed Git commit, leaving all Windows services/tasks unchanged.
The old LAN inspector had a known read-only `$HOME` bug; do not treat
a restored legacy inspector's PWA failure as authoritative.

## Acceptance and pending items

CI gates: 5/5 development PR and independent dev push; 5/5 production PR
and independent main push. No CI result substitutes for actual server
execution or a controlled Windows restart.

As expressly requested, **server reboot persistence stays DEFERRED**.
Remote-client certificate trust was previously reported working but is
not silently re-certified by the new script.

## Next proposed

Build 083 — choose the next practical home/workshop/business feature from
the project roadmap after the Build 082 release.
