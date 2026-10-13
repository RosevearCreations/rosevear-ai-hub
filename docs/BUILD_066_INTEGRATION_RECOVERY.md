# Build 066 — Guided Integration Recovery & Operator Acceptance

## What this build changes

The owner/administrator **System → Managed Release** panel now includes
step-by-step recovery guidance for **Home Assistant, MQTT, Ollama, Frigate,
and go2rtc**. The panel reads a strictly bounded **optional local operator
report**. It never restarts services, scans cameras, sends MQTT messages,
reconfigures credentials, opens firewall ports, or certifies machine recovery.

The existing endpoint `GET /api/v1/system/release-observability` remains
owner/administrator-only, manual-refresh and `Cache-Control: no-store`.

### Safe recovery order on the Windows Hub server

1. Confirm which Hub backend is running, and which private database/config
   that installation uses. Multiple copies can show different device lists.
   First use the existing local `scripts/Run-Hub-Release-Assurance.cmd`.
2. **Home Assistant:** confirm the VM is actually running. On the Hub's
   Home Assistant page refresh status; check private service URL and token
   only on the server. If reachable, verify expected entities/devices.
3. **MQTT:** confirm broker/add-on running. Check the Hub-side broker
   host, port, credentials and TLS. Refresh the Hub's MQTT page and verify
   it shows an active connection. Do not publish test traffic without
   intentionally approving it.
4. **Cameras / go2rtc:** open Cameras. A blank Hub camera list can mean
   *no entries saved to this specific Hub database*, not a hardware failure.
   Check registrations and streams. Only use ONVIF discovery or stream
   reconciliation deliberately from the Cameras page.
5. **Frigate:** check the Frigate service separately, then inspect the
   camera-event panel; no events does not itself prove a broken camera.
6. **Ollama:** verify the local service and expected model through its Hub
   page. Running `ollama serve` when the port is already owned can cause
   a misleading failure; inspect the existing process first.
7. Refresh the **System → Managed Release** panel. Review the instructions
   and only record a working result once all three operator checks are true.

### Optional operator acceptance file (read only to the application)

Only if the operator wishes to record what was observed on the real Windows
server, create `logs/hub-deployment/integration-acceptance.json`
under the *running installation's* repository root. This path belongs in
private, Git-ignored `logs/`, **never GitHub or CI**. Example values below
are illustrative; use the actual current ISO UTC timestamp, not the example
time, and only mark checks true after performing them.

```json
{
  "schema_version": 1,
  "reviews": [
    {
      "integration": "home_assistant",
      "status": "investigating",
      "checks": {
        "service_reachable": false,
        "authenticated_read": false,
        "expected_data_visible": false
      },
      "observed_at_utc": "2026-10-13T22:00:00Z"
    }
  ]
}
```

Supported integration IDs: `home_assistant`, `mqtt`, `ollama`,
`frigate`, `go2rtc`. Allowed statuses: `investigating`,
`blocked`, `operator_reported_working`. Checks must contain exactly
`service_reachable`, `authenticated_read`, and
`expected_data_visible`, with Boolean values. A report of working is
**rejected** unless all three checks are true.

Up to five unique integrations can be recorded. The entire document must
be at most 8 KiB, schema version 1, and timestamps must have a UTC offset
and be no more than five minutes in the future. Results older than
14 days display as `stale`. Malformed, duplicate, extra, symlinked
or oversized evidence is rejected without showing raw data. Do not store
tokens, private IP addresses, usernames, connection strings, passwords or
free-text notes here; extra fields invalidate the record.

The report is **operator self-attestation only**. Even
`operator_reported_working` is *not* independently machine-verified,
and never automatically authorizes an unattended update, backup restore,
camera modification or incident closure. Live acceptance remains a
separate on-server step.

## Build acceptance

- Python tests: missing, valid, stale, duplicate, extra-fields,
  truncated/oversized and symlinked evidence.
- Web test: guidance renders while clearly distinguishing operator
  reports from verified live service status.
- No new SQL migration, scheduled task, outbound monitoring, dependency,
  service restart or private network exposure.
- After PR CI and independent `main` CI pass, the **GitHub code
  promotion** can be marked GREEN. That is not an on-server deployment
  or hardware acceptance certificate.

Next queued: **Build 067 — Integration Health Evidence & Safe Remediation Readiness**.
