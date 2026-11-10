# Build 304 — Ree Server Monitoring Persistence & Master360 Activation

## Reconciliation and trust

- Controller: `RosevearCreations/ai-data-platform` `main` at
  `4b45b435fa7b6fc83b94e31556648fe4190a9f53`.
- Contract: `docs/master-shell/MASTER_360_ACTIVATION_CONTRACT.json`, Git blob
  `5c361cf41de9ca2c1f9e5d2ffe2030fa1179f1f3`.
- Comms Hub counterpart: `RosevearCreations/rosevear-comms-hub` `main` at
  `ccbeab4307ed6458399dcb0eb03324aeaf12f97f`.
- AI Hub source `main` before Build 304:
  `9df3130cbe87dd65a6a3da9c238a521f8fff38a5` (Build 303).
- Code receipt: `docs/master-shell/MASTER_360_AIHUB_ACTIVATION_ACK.json`.

## Ree Windows server installation (owner-supervised, no new task)

The original host is `DESKTOP-AE894KC`. The current server process/launcher
must actually be running Build 304 to produce observations. We have **not**
accessed or changed the actual Windows host, Scheduled Tasks, protected source
signer, Comms receiver or database enrollment in this GitHub code build.

Within the **existing AI Hub Python launcher's process environment on Ree's
host only**, set both:

```powershell
$env:ROSEVEAR_MASTER_LOCAL_MONITOR_303='1'
$env:ROSEVEAR_REQUIRE_REE_AUTOMATION_HOST='1'
```

These values alone do not persist across reboots. Configure them in the
existing approved launch mechanism only after its current configuration,
installed release and recovery ownership are confirmed; **do not create a
second Scheduled Task**, replace the recovery task, or run automation on
Jack's `TEMPLAR` laptop. Use the existing restart/startup controls.

Once the process is running on Ree's actual host, authenticated owners may
open **I.T. / Integration Health → Build 304 Master activation evidence** and
press **Refresh**. The protected `GET
/api/v1/system/master-shell-reconciliation` exposes bounded, metadata-only
observations. A local private `%LOCALAPPDATA%/RosevearAIHub/MasterShell/
uptime304.sqlite3` ledger stores at most **10,080 one-minute** records from
the most recent **seven days**. It samples only `127.0.0.1` TCP ports
8765, 5173 and 8443, and makes no remote probes. These are **observed port
availability**, not full service uptime percentages or user experience SLOs.

## Boundary for the Master Shell integration

1. **AI Data Platform:** owner-authorized protected adapter may call the
   source telemetry signing helper only after the independent original-Windows,
   source/master owner, signer, consent and durable one-use replay claim
   evidence all verify. The resulting short-lived Ed25519 envelope contains
   only source revision, timestamp, loopback observation counts and scope;
   it is marked `TEST` and does not submit itself or imply CONNECTED.
2. **Comms Hub:** after three consecutive one-minute failed TCP observations,
   source-revision-bound incident candidates can be prepared for protected
   independent review. Receiver-signed ACK verification is a component only;
   no receiver activation, notifications, incident writes, recovery commands
   or server-to-Comms transport were added.
3. **Ree original host:** the sampler is disabled on other OSs/hostnames, or
   without both host and automation policy flags. The existing event worker
   and recovery-task authority remain unchanged. A browser cannot enable
   sampling, sign receipts, or send alerts.

The connection and `HOLD_NEXT_MASTER_INTEGRATION_STAGE` gate stay HOLD until
live protected telemetry, receiver audit/ACK, original host installation and
durable history evidence are independently verified by all three Masters.

## Security and checks

Unit tests exercise host denial, minute deduplication, SQLite persistence
across process restarts, bounded retention, three-failure candidates, signed
test envelope, replay refusal, signed ACK scope/tamper refusal, owner auth,
and a front-end parser that rejects false CONNECTED claims. Run the existing
backend/web/build CI gates before promoting `dev` and `main`.

**Next proposed Build 305:** Master360 Ree Host Installed-Release Verification,
Protected Telemetry One-TEST Receiver Correlation & Uptime Dashboard Acceptance.
