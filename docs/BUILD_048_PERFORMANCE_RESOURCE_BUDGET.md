# Build 048 — Performance and Resource-Budget Review

## Goal and scope

Rosevear AI Hub runs locally on Windows alongside Ollama, a Home Assistant VM, MQTT,
Caddy/Tailscale, and optional go2rtc cameras. This build provides an administrator-only,
read-only, on-demand resource-budget snapshot and a repeatable operator baseline.
It **does not** run stress tests, automatically tune services, stop tasks, or collect
telemetry in the background.

GitHub CI does **not** know the Windows server's RAM, CPU, GPU, drives, running camera
streams, or actual Ollama latency. Do not claim that the server meets performance
targets without on-server observations.

## Implementation

- GET /api/v1/system/resource-budget is available to owner or administrator
  accounts, never to anonymous or household/read-only accounts.
- Reports Hub Python API current resident memory, cumulative CPU seconds,
  host total/available physical memory and free/total space on the Hub
  working-directory volume. It does not list processes, folders, tokens,
  identities, cameras, or IP addresses.
- System page has a manual Refresh resource snapshot button. No background
  polling, database writes, telemetry upload, subprocess scanning or automatic
  intervention. Response includes Cache-Control no-store and generic error
  handling without system-path leakage.
- Guidelines, not enforcement: Hub Python process resident memory >= 1 GiB,
  host available RAM < 2 GiB, or Hub working volume free < 2 GiB indicate
  review recommended. Measurements do not block normal requests.
- Process CPU seconds are cumulative, not instantaneous utilization.
  RAM from Ollama/VM/go2rtc is reflected in overall host availability but
  is not attributed to individual processes. GPU utilization, models and
  other disks are not included.
- Home/System headers fetch actual API version rather than showing stale
  Build 036 / Build 046 labels.
- Uses local psutil package with no hosted service; package is installed by
  the existing Windows update command. No migration or firewall change.

## Workload and budget review matrix

| Component | Automated view | Human acceptance |
| --- | --- | --- |
| Hub FastAPI | API RSS and cumulative CPU time | Compare idle, chat, knowledge browsing |
| Host RAM | Available and total | Compare with Ollama loaded and Home Assistant VM active |
| Working disk | Free and total | Check backup retention and Ollama model volume separately |
| Ollama | Not individually measured | Record actual model, RAM/GPU use and chat response time |
| Knowledge | No synthetic workload generated | Use a safe test document and compare query/ingestion latency |
| go2rtc / cameras | Not individually measured | Verify approved stream lag and drops under normal load |
| MQTT / HA VM | Host headroom only | Verify responsiveness and recovery with Ollama active |
| LAN / Tailscale | Unchanged | Test approved clients and authorization separately |

Default to one Ollama generation at a time while collecting a baseline. Never
run bulk command traffic against home controls, MQTT, cameras or business writes
to create synthetic load.

## Test-server acceptance: commands and observations

After a verified release, run the normal test-server update, restart only the
Hub API using the existing safe recovery procedure and verify /version reports
0.0.48. On the Windows server in PowerShell:

    Invoke-RestMethod http://127.0.0.1:8765/version | Format-List
    Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory, NumberOfLogicalProcessors
    Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free

Use an authorized HTTPS browser on Templar or the server; sign in as the owner
or administrator and open System -> Performance and resource budget -> Refresh.
Record idle values and recheck after normal chat and knowledge activity. Never
share raw credentials, camera credentials, paths or private tokens in reports.

For a small five-request local smoke sample, **not** a load test or SLO:

    1..5 | ForEach-Object {
      (Measure-Command {
        Invoke-RestMethod http://127.0.0.1:8765/health | Out-Null
      }).TotalMilliseconds
    }

Use a local offline log for before/after numbers and note which Ollama model
was running. Do not infer capacity or performance from synthetic CI machines.

## Security and rollback

- The new endpoint is protected by owner/admin session role enforcement and
  returns no file paths, network addresses, user identities or process lists.
- No public listener, CORS policy change, cloud storage, credentials, API
  mutations, scheduled task, or new database schema.
- Tests check sample thresholds, data minimization and owner/admin vs denied
  household-user access. Desktop/Windows backup CI remains in force.
- Roll back using the prior verified main commit and restart only the API.
  No configuration, certificate, data or migrations need reversing. Do not
  terminate Tailscale, Caddy, Home Assistant, MQTT, go2rtc or Ollama.
- Code CI GREEN is distinct from live performance-budget acceptance.

Next: Build 049 — Threat Model and Security Review.

Official references:
- https://psutil.readthedocs.io/en/latest/
- https://docs.python.org/3/library/shutil.html#shutil.disk_usage
- https://fastapi.tiangolo.com/tutorial/dependencies/
