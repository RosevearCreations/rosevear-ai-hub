# Build 109 — Device & Camera Recovery Receipt Reconciliation & Owner Acceptance

## Purpose

Build 109 closes the gap between **a Build 108 owner field-review receipt** and the **next actual registry reading**. It does not treat earlier camera playback or a Home Assistant registry entry as automatic evidence of restored physical function. It records follow-up observations in a private owner acceptance packet with unresolved holds.

## Operator workflow on the Windows Hub

1. Install/update the Hub from verified `main` using the existing supervised Windows update process. Leave the current VM and Hub backups intact.
2. In **Home Assistant → Device & camera inventory recovery**, click **Recheck inventory**. Device, entity, camera registry, health and go2rtc listener reads are independent. If the inventory is unavailable, the acceptance section remains held; an error is not treated as an empty registry.
3. Under **Build 109 — Reconcile an earlier field review**, import the private `rosevear-supervised-field-review-YYYY-MM-DD.json` downloaded in Build 108. The file remains local to this browser; it is not sent to Hub APIs, MQTT, HA or the camera registry.
4. The app checks that the current identity snapshot was captured **later than** the snapshot named in the earlier receipt, and that it remains recent (within five minutes). A repeated, older or expired reading cannot be used as follow-up acceptance. Recheck inventory if it ages out.
5. For every formerly missing HA device, entity or camera registration, the app checks its **exact stable identity** in the new snapshot. If it reappears, the owner may acknowledge that they checked its new physical/registry state. A missing identity cannot be approved as recovered merely because the owner ticked a box in the earlier receipt. An item previously explicitly marked *intentionally retired* can be separately acknowledged as an exception, but is not counted as recovered.
6. For each current or previously documented camera, review its live view under **Cameras**, run an authorized health probe and watch **moving video**. Build 109 requires another **current** owner acknowledgement. The checkbox is unavailable unless the current camera is registered and its fresh health/private go2rtc checks pass. A prior playback acknowledgement is historical context only.
7. **Download owner acceptance receipt (including holds)**. The output distinguishes identities reappearing in registries, retired exceptions, still-missing devices, historical playback claims, new current camera registrations, fresh operator-observed playback and every outstanding hold. Keep the receipt private. All marks are browser-session-only and automatically invalidated when the current registry snapshot changes.

## Safety and evidence model

- Input must use schema `rosevear-device-camera-field-review/v1`. The JSON parser limits input to 1 MB, bounds list and text sizes, rejects duplicate stable IDs, unsupported dispositions, contradictory video claims and reversed timestamps, and strips unexpected fields rather than retaining secrets or camera addresses.
- Output uses `rosevear-device-camera-owner-acceptance/v1` with identity-only fields. The receipt **does not include credentials, RTSP URLs, HA attributes or network hosts**.
- The original owner's field-review receipt is **unsigned, self-reported context**. Imported historical claims are not independently verified. The new receipt's `owner_attested_only` outcome is explicitly a self-attestation; the application cannot independently confirm physical hardware just because a checkbox is selected.
- The workflow performs **no database restoration or migration; no discovery, camera registration, stream configuration, HA integration enrollment, MQTT publishes or physical controls**. Those operations continue through existing explicit owner-supervised interfaces and compatible verified backups.
- No auto-match of renamed/replaced devices. Stable ID equality demonstrates registry continuity only; owner must inspect integrations and physical behavior for functional acceptance.
- When HA or cameras remain absent, transport safety cannot be confirmed, no video plays, or import provenance is invalid, the follow-up stays held and the exported receipt says so.
- Even if a browser stays open, old registry evidence cannot qualify for new owner acceptance or export; the export operation re-checks reading age.

## Verification and release gate

- Pure-unit tests exercise receipt sanitization, malformed/oversized inputs, contradictory video and time provenance, exact identity changes, retired exception handling and refusal to carry prior video acknowledgements forward.
- React tests verify private owner import, prior/new snapshot ordering, ineligible camera hold and per-snapshot reset of manual marks.
- Web suite, typecheck, production build and all five repository GitHub Actions jobs must pass independently for the feature PR, `dev` push, `main` promotion PR and final `main` push.

**GitHub CI GREEN confirms the Build 109 application code release, not actual Windows server deployment or real camera playback**. The owner still must install the new version and collect the real-world observations before physical acceptance can be described as complete.

## Next queued

Build 110 — **Integration-Level Missing Device Evidence & Camera Recovery Follow-Up Queue**: use actual owner-reviewed packets to group unresolved HA integration, identity change, network/VM and camera live playback cases without implying that the Hub can control or re-enroll everything automatically.
