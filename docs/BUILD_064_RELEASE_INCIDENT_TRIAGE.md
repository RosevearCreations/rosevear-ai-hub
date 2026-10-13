# Build 064 — Release Incident Triage & Recovery Evidence Continuity

## Application scope

The authenticated owner/administrator **System → Managed Release** panel now
summarizes the same bounded, read-only seven-day release evidence into three
incident categories:

- `adoption_failure` from locally recorded `FAILED` events.
- `adoption_hold` from `HOLD` events.
- `recovery_incident` from `ROLLED_BACK` and `ROLLBACK_FAILED`.

Each category reports the **number of observed events and UTC days affected**,
plus whether its outcome appeared on at least two dates. A retry may generate
multiple events for the **same physical incident**. These are neither unique
incident IDs nor estimates of successful releases. Truncated, malformed or
missing log history remains `partial`. No raw local log text, credentials,
paths, task command lines, event messages or failure descriptions reach the API.

An optional operator follow-up ledger may be kept privately at
`logs/hub-deployment/release-incident-reviews.json`. The application
reads **only** schema version 1 with at most 20 entries, a unique short
alphanumeric/hyphen reference, a recognized category, one of `open`,
`investigating`, `operator_reported_resolved`, and a UTC review time no
more than 90 days old. Example:
```json
{
  "schema_version": 1,
  "reviews": [
    {
      "reference": "case-001",
      "category": "adoption_failure",
      "status": "investigating",
      "reviewed_at_utc": "2026-10-13T20:00:00+00:00"
    }
  ]
}
```
This is a **read-only optional private file**; Build 064 never creates,
updates, closes, deletes or synchronizes entries. Displayed output includes
only aggregate counts and latest review time. `operator_reported_resolved`
is not automatically verified or allowed to enable unattended update adoption.
On invalid files the status is `invalid` and no records are exposed. This
ledger stays in Git-ignored `logs/`, and the example is not a real incident.

The server does not retry a failed deployment, run a rollback drill, trigger
a process restart, call Alembic, change scheduled tasks, or grant remote
access during these queries. `GET /api/v1/system/release-observability` keeps
its existing authentication/owner-only and no-store enforcement.

## Home dashboard corrections from the October 13 screenshot

The screenshot shows the **0.0.57 backend online** but three separate conditions:

1. **Home Assistant: configured, unavailable.** This only establishes that
   the Hub sees saved setup but cannot complete its health request. On the
   Windows server, first verify the Home Assistant VM is powered on and
   reachable by the Hub using its configured local URL and port 8123. Review
   the protected token and the exact Devices status. Do not paste credentials
   or private URLs into chat, CI, or public logs. The dashboard now explains
   the VM/API/token checks rather than simply "configured but unavailable."
2. **MQTT: configured, unavailable.** This means the configured MQTT client
   does not have an active broker connection at the time of the snapshot;
   review broker/add-on state, host/port, TLS and private credentials on the
   MQTT page. Existing Home Assistant MQTT setup does not guarantee that the
   separate Rosevear Hub Python process can connect. Refresh after checking
   the broker; this build never publishes or subscribes.
3. **Cameras: none registered in this Hub database.** This is **not** proof
   that physical ONVIF, RTSP, go2rtc or Home Assistant cameras are absent.
   Review the Cameras page and its ONVIF discovery tools. Camera discovery
   and saving streams are separate user-controlled actions and are **not**
   initiated by the Home dashboard or this build.

If one computer has multiple live Hub installations, verify they use the same
SQLite database/configuration and intended user account **before** migrating
or importing any cameras. A GREEN GitHub SHA alone does not establish the
Windows runtime has adopted it.

## Release and rollback

Tests exercise incident count aggregation, repeated day detection, private
ledger validation, malformed data, no file writes and secret redaction, plus
dashboard guidance for all three systems. No database migration, external
network action, installation, VM/camera/IoT command or scheduled-task edit
is included. Rollback of this build removes only the new incident reporting
and UI guidance while keeping the operator ledger, recovery checkpoints,
database and original 17 stashed Windows scripts untouched.

**Next queued:** Build 065 — Incident Follow-Up Routing & Integration Diagnostics.
