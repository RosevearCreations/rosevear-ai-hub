# Rosevear AI Hub Build 361 / QL-470 — Original Host Recovery, Worker Rollback and Dashboard

## Physical acceptance status

The original DESKTOP-AE894KC Windows evidence last showed both known unattended startup and recovery tasks installed with exact identities but DISABLED. Home Assistant runs in VirtualBox, not Hyper-V. There is no verified original-PC reboot before sign-in, independently accepted camera/MQTT/guest recovery, or independently enrolled AI Data Platform and Comms worker signed ACK. GitHub code production GREEN is distinct from physical runtime HOLD.

## Source deliverables

1. scripts/inspect-host-recovery361.ps1: Original-host read-only inventory of Windows boot time, two exact known tasks, last run/result, three exact Master service states, plus bounded Task Scheduler event IDs and UTC times. The event IDs do not prove a particular task started. No secrets, usernames, event messages, credentials, task arguments, installation, enablement or reboot.
2. server/src/rosevear_ai_hub/master_acceptance361.py: strict source-commit, age, shape and host guard; any stale, offhost, forged status or extra service HOLDs. It never treats local inventory or signer claims as independently proven real operation.
3. docs/contracts/ql470-worker-enrollment361.json: non-executable, disabled-first owner/custodian review and rollback contract for Rosevear-AIHub, Rosevear-AIDataPlatform and Rosevear-CommsHub. No guessed worker installer, account, secret or automatic service installation.
4. Owner-only GET /api/v1/system/server-shell-361: reads only original-PC privately configured local JSON paths. No API service, task, VM or QL-340C receiver mutations.
5. The existing System screen now includes an owner-only QL-470 acceptance dashboard: one initial GET and explicit Refresh evidence; no background polling, false live connectivity, or action buttons.
6. Backend/frontend tests reject fake GREEN, stale provenance, invented worker authority and unapproved receiver status.

## Original-host inspection, read-only

From the existing ORIGINAL Windows clone of this repository, once main CI is GREEN:

    cd C:\Users\ree\rosevearaihub
    git status --short --branch
    git pull --ff-only origin main
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Inspect
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-reboot-continuity358.ps1 -Mode Preflight
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-host-recovery361.ps1

For original-host local dashboard input only, privately save the nonsecret final JSON outside the Git repository and set the server-side variables ROSEVEAR_QL470_TELEMETRY_PATH to that file, ROSEVEAR_QL470_EXPECTED_COMMIT to the independently verified original-PC 40-hex commit, and optionally ROSEVEAR_QL470_FIELD_REPORT_PATH to a privately verified Build 360 field review JSON. These are not browser settings. This release does not create files, schedule telemetry capture, access private keys, or auto-refresh. After 120 seconds the cached inventory correctly becomes HOLD.

Preserve the unrelated untracked local package-lock.json; do not re-run task -Install, enable either task, reboot, mutate original VirtualBox, auto-enroll the two other Masters or authorize the private QL-340C TEST receiver as a result of source success.

## Installation and rollback gates

A future separately supervised maintenance window requires a restorable off-host Hub/HA backup; trusted independent HTTPS, HA authenticated API, MQTT signed publish/ACK and camera playback; owner-approved original-host supervised one-time task and reboot; independently signed pre-login witness; separately approved worker installers and Windows service identities from each Master app; pinned private mTLS and independently received signed durable ACK; verified rollback and explicit owner authority. Source code cannot certify any of those real-world events. A signed field reviewer statement is still a claim, not independent authentication proof.

The three-Master UI remains synchronized in information architecture, but each Master is released independently. Do not force-sync divergent dev and main branches, or delete unmerged release refs.

**Next proposed Build 362 / QL-471:** independently signed field evidence intake, original-host recovery drill history and owner-controlled Master worker pilot readiness. No automatic live activation.
