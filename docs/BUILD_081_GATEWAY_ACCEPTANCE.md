# Build 081 — Private Gateway Acceptance Evidence & Deferred Reboot Readiness

## Why this build exists
Build 080 corrected the gateway sign-in worker and its reserved PowerShell `$HOME` assignment.
The older `scripts/inspect-hub-lan.ps1` had the same defect in its read-only
PWA check. Build 081 fixes that false negative and makes remaining operator
acceptance explicit without requiring an unsafe or inconvenient server reboot.

## New non-disruptive report
On the **Windows server**, from the repository folder after installing the exact
Build 081 release:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\inspect-hub-gateway-081.ps1" -LanIPv4 "192.168.68.74"
```

The report reads the current LAN IPv4 assignment, loopback-only API, built PWA
health and manifest, port 8443 Caddy process identity, privately scoped Windows
Firewall rule, and exact Windows sign-in task identity/latest result.

It does **not** change addresses, certificates, firewall, scheduler, VM,
camera settings, databases, or running processes. Failures are HOLD. Existing
service credentials, log bodies, camera endpoints and certificate private keys
are never printed.

The conservative classification is **READY_FOR_REMOTE_RECHECK** only if the
local checks all pass; it is not an assertion that the remote browser is
secure, a real reboot occurred, HA/MQTT work, or backups can be restored.

## Owner acceptance and deferral
As of 2026-10-16 the owner reports that the **client PC** connects to
`https://192.168.68.74:8443/` without certificate warnings following a
client restart. That is owner-provided evidence of client browser trust, not
a continuous automatic verification.

The owner explicitly deferred the **Windows server** restart. The report
therefore always uses:
- `remote_client_tls = MANUAL_RECHECK_REQUIRED`
- `authenticated_client_access = MANUAL_RECHECK_REQUIRED`
- `reboot_persistence = DEFERRED_BY_OPERATOR`

The future owner-controlled server reboot check remains separate. When
convenient, save open work, account for the Home Assistant VM and services,
restart the server deliberately, sign in, then check Scheduled Task last result,
Caddy TCP/8443 reachability, client TLS and authenticated login. Do not
infer reboot success from a successful manual `Start-ScheduledTask`.

## Security and rollback
No SQL migration, external account, new dependency or task installation.
If the reporting commands are not desired, simply do not run them. Revert
the Build 081 reporter, policy and test files, and restore the prior inspector
implementation only if deliberately rolling back; the old inspector has a
known misleading `$HOME` false negative. Gateway operation does not depend
on this report.

Windows CI parses affected scripts, rejects case-insensitive assignments
to `$HOME`, rejects mutation commands in the reporting code, and exercises
failure, missing task result, and healthy-but-still-deferred cases.

## Release gates
- Dev PR and dev independent push: 5/5 checks
- Main PR and independent main push: 5/5 checks
- Only after those checks can **GitHub code release** be labeled GREEN.
- Actual Windows post-reboot acceptance remains DEFERRED, even after code GREEN.

## Next proposed
Build 082 — scope to be selected from renewed practical operations roadmap;
the deferred reboot is a separate operator acceptance gate, not a requirement
to continue developing other Hub capabilities.
