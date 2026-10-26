# Build 148 — Cross-Module Owner Trial, Accessibility & Local Windows Field Acceptance

## Delivered source capability

The **System → Home operations field trial & follow-ups** card is visible to authenticated **owner/administrator** roles. It records an explicitly supervised manual trial across nine existing views:

1. Home room status and route links.
2. Device 360 identities, room assignments, unknown devices.
3. Private approved camera playback/events (real moving media, not a metadata placeholder).
4. Home Assistant allowlisted entity and scene **preview** only.
5. MQTT topic/identity inspection without any publish.
6. Workshop preventive maintenance evidence and no-operation holds.
7. Windows startup/service recovery evidence from the actual host.
8. Narrow-screen, keyboard, focus, contrast and available screen-reader checks.
9. Local console/private LAN/tailnet login without router changes.

Each card links to the corresponding existing Hub screen. The trial does **not** implement hardware access, Windows restart operations, MQTT sends, camera RTSP probing or automatic scene execution.

## Evidence classes and field acceptance boundary

The workbench displays **FIELD ACCEPTANCE: HOLD** unconditionally, even if every trial check has an owner-observed pass. There are five different evidence classes:

| Evidence | What it means | What it does **not** prove |
| --- | --- | --- |
| GitHub source CI | Static, unit, backend, desktop and Windows synthetic checks passed on a particular commit | That our Windows installation was updated or is running |
| Installed version and access | An owner-entered version label, private connection category and explicit actual-Windows witness | That every service, device or camera works |
| Explicit read-only GET snapshot | Coarse health classifications for Hub, Ollama, HA, MQTT and go2rtc at a timestamp | Real device actuation, moving playback or a successful reboot |
| Owner-witnessed case | A person safely tried the exact module and chose pass/issue/blocked with time and assigned next role | Independent review or physical certification |
| Independent acceptance | A future separately witnessed review on the real Windows PC with actual required safety approvals | Never conferred by this source build or a JSON checkbox |

No default trial outcomes are prepopulated. An owner pass requires a version/access category witnessed on the installed host and a separately checked attestation; an issue or blocked observation requires a nonempty category and next-action owner. Previous failures persist when a later pass is recorded and become **retests awaiting independent review**, not automatically closed.

## Privacy, continuity and safe operation

- All trial marks and coarse GET statuses are held in the current signed-in browser session. The workbench stays mounted while an owner follows its links to other modules and returns to System; signing out or refreshing clears unsaved evidence. There is no localStorage, automatic upload, database insert, telemetry subscription, polling or background hardware check.
- A deliberate **Download private HOLD-labelled JSON receipt** saves a bounded, structured file with a stable schema, sanitized version label, coarse service status, category, next-action role and observation timestamps. It never contains captured RTSP URLs, IPs, hostnames, MQTT payloads, usernames, credentials or free-form secret-bearing notes.
- Prior receipts may be explicitly imported with a size and schema check; importing over existing session observations prompts for confirmation. Import always resets fresh installed-Windows witness status. Historical attestations are context, not current proof.
- Read-only API status becomes stale after five minutes or upon import; fresh classification requires another explicit button press.
- Role gating uses the app's existing owner/admin checks; read-only users cannot open the workbench.
- The first-party household password/document Vault remains at **0/6 independently verified — SECURITY HOLD**. No credential entry or activation is possible here.

## Acceptance tests

From `apps/web`:

```sh
npm run typecheck
npx vitest run src/ownerFieldTrial.test.ts src/OwnerFieldTrialWorkbench.test.tsx src/App.test.tsx
npm run test
npm run build
```

Manual acceptance on our Windows host remains outstanding until an owner performs it. The safe trial order:

1. Confirm the actual installed version in System. Inspect the intended original Home Assistant VM and approved MQTT/camera source identities before marking anything.
2. Open System → **Home operations field trial & follow-ups**. Set the manually witnessed version and connection category. Record **no** pass based on an API response alone.
3. Open each named screen. Observe only safe preexisting navigation/preview/read-only behavior, actual camera playback and manual Windows service evidence; record blocked/unavailable status where real confirmation cannot be obtained.
4. Assign/acknowledge each finding, export the receipt to private local storage, and continue later by importing it. Retest only after a deliberately reviewed repair.
5. Keep GitHub source GREEN and actual Windows/device/independent field HOLD separate. A later Build 149 should reconcile observed findings and repeat safe acceptance instead of silently clearing them.

## Promotion process

Source release must go feature branch → green pull request to `dev` → independently green `dev` push → green pull request to `main` → independently green `main` push. Only then is **source Production GREEN**. Physical field acceptance remains a separate witnessed outcome; no CI runner has access to our actual household equipment.
