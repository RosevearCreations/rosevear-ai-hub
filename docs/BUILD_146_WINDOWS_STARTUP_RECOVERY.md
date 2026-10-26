# Build 146 — Windows Service Startup & Recovery Operations Console

## Implemented

The owner/administrator `System` page includes an on-demand, **read-only** startup/recovery workbench. It captures a sanitized service snapshot using existing authenticated Hub, Home Assistant, MQTT, Ollama, go2rtc, Frigate and release-observability GET endpoints. Failures are classified as `unverified`, not falsely treated as service outages or successes. Local-only relay flags must be true to count the two camera integrations as available.

The workbench can hold an in-session pre-maintenance baseline and compare it with a later manual refresh. Stable service readings do **not** prove a reboot took place, nor can an API response establish physical camera motion, VM identity or Windows scheduled-task ownership. The six owner self-checks are reset on each new read. They only raise `Owner review ready` after a later stable reading, all services available, a fresh classified task import and all six manual observations. Independently witnessed *installed Windows acceptance always stays HOLD*, including in exported receipts.

## Read-only Windows inspection

In an inspected checkout on the **actual Windows PC**, run this read-only PowerShell script, then paste the JSON into the System workbench:

```powershell
powershell -NoProfile -File .\scripts\inspect-hub-startup-console.ps1
```

It observes only the named existing tasks:

- `Rosevear AI Server Startup` — original household server task;
- `Rosevear AI Hub Startup` — separately configured Hub managed startup task;
- `Rosevear AI Hub Recovery` — separately configured Hub managed recovery task.

The script reports fixed status classifications (`enabled`, `disabled`, `missing`, `unverified`), last result (`success_recorded`, `failure_recorded`, `never_recorded`, `unverified`) and whether that result belongs after the currently observed Windows boot (`after_boot`, `before_boot`, `unverified`). It does not display task commands, principal usernames/SIDs, file paths, hostnames or credentials. A recorded task success is **not** independently verified running-process identity. A missing or before-boot task is an investigation cue: do not automatically install or duplicate it.

The UI import is limited to the exact report schema, exact three tasks, 24-hour age, 10 KB input and fixed enum values. It rejects any additional fields, so accidental pasted secrets and raw event logs cannot enter the review. Imported JSON is operator-provided and has no cryptographic attestation. Browser memory is session-only; no backend writes, localStorage, device controls, task changes, scheduled polling or automatic VM startup occur.

## Supervised Windows diagnosis

1. Inspect encrypted restorable backup, the existing Windows scheduled task ownership/history and the original VirtualBox Home Assistant VM; avoid duplicate process or VM launches.
2. Capture the API baseline before an **independently approved** Windows reboot/power restoration. The UI does not initiate either action.
3. After Windows logon, independently observe task execution, VM identity, Home Assistant web operation, MQTT integration, Ollama and private HTTPS from an authorized client.
4. Refresh read-only Hub endpoints, compare to baseline, then observe local-only go2rtc/Frigate plus actual required moving camera video from the approved private viewer.
5. Record only manually observed self-checks. Export a private metadata-only receipt for follow-up; the result retains `installedWindowsAcceptance: HOLD`. Re-open any missing, changed, failed, stale or ambiguous observation.

The console does **not** create a Caddy or Tailscale probe. The separately signed-in private HTTPS client check remains manual. Power-restoration acceptance requires a real supervised field test, not source CI.

## Test contract

- Pure tests cover allowlisted classification, stale/future evidence, secret field rejection, API failure, local-only relay gates, missing dependencies, chronology, incomplete checks and permanent physical HOLD.
- UI tests cover no load-time probes, explicit refresh, redaction of raw URLs/messages, task import rejection, manual-check reset and accessible navigation.
- The PowerShell inspector has no mutation calls and emits only a bounded JSON evidence classification. Its real task results and field order must be reviewed locally on the Windows machine.

**Next expected Build 147:** Responsive Command Shell, Theme Polish & Contextual Help Refresh.
