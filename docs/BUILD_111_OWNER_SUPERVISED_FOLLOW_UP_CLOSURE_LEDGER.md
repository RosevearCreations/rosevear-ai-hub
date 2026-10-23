# Build 111 — Owner-Supervised Integration Follow-Up Closure & Camera Playback Recheck Ledger

## What is delivered

Build 111 adds a read-only, local-only closure workbench to **Devices → Device & camera inventory recovery** after Builds 109–110. It imports the owner-exported Build 110 follow-up worklist and compares every recorded Home Assistant device, HA entity and Hub camera by **exact source plus ID** against a later, fresh registry snapshot.

Every item stays **open** unless a permitted, explicit owner action is recorded for the current reading:

| Identity state | Closure action | Remains held when |
| --- | --- | --- |
| HA identity reappears | Owner personally checks the function | Identity present but unchecked |
| HA identity remains absent | Owner explicitly confirms intentional retirement | Identity absent but unconfirmed; failed HA registry read |
| Camera registered with fresh, private healthy stream | Owner personally watches moving live video | No current-session moving-video acknowledgment |
| Camera missing/unsafe/unhealthy | **No closure action offered** | Registration, stream or private go2rtc probe evidence missing |

The output is a bounded, identity-only private closure **ledger**. A subsequent import of this ledger and fresh inventory appends a new review; previous owner-attested closures **reopen** until verified again. Summary counts separate *open holds*, *owner-attested closes* and *reopened* cases. No earlier camera playback mark carries forward.

## Field operator procedure

1. Complete Build 109 and 110 supervised reviews and save the private Build 110 JSON follow-up worklist. Keep it off public pages and issue comments; device names can identify our home or workshop.
2. In the Windows Hub PWA, open **Devices → Device & camera inventory recovery**, select **Recheck inventory** and require an authenticated HA registry plus the Hub camera registry. Unavailable reads are **UNKNOWN**, not empty.
3. Under **Build 111**, import the Build 110 worklist. Optionally import an earlier Build 111 ledger **from the same worklist** to continue that history.
4. Check **Home Assistant → Settings → Devices & services** and physically operate each reappeared function before ticking its acknowledgment. If the ID is absent, tick retirement only if we intentionally retired it and independently confirmed that fact. Do not treat missing status as evidence of deletion.
5. For each camera, inspect **Cameras** and its private go2rtc/stream health. A camera that is unregistered, unhealthy, unsafe, or lacking fresh evidence stays open. Only after viewing **moving live video** mark current playback.
6. Download **private closure ledger, including open holds**. The export records exact ID/status/stage/owner action/registry and review times plus counts. Keep it private. If a case reopens on the next snapshot, recheck before any new claim.
7. Perform a separate owner acceptance on the actual Windows test machine and cameras. A successful source build or GitHub workflow does **not** prove Home Assistant discovery, MQTT, video, TLS, boot or device operation.

## Safety, privacy, and persistence

- No automatic HA integration onboarding, ONVIF registration, recording, go2rtc configuration, MQTT commands, camera access, database restoration, backup manipulation, network side effects, or Windows service/task changes.
- Incoming files are limited to 1 MB; the Build 110 importer validates schema, timestamps, exact IDs, stage/source pairing, owner group labels and summary counts. Non-allowlisted evidence notes and accidental URL/token metadata are discarded. Credentials/RTSP URLs are not retained in the export.
- Previous ledger import rejects different source worklists, missing/duplicate IDs, inconsistent decisions, timeline reversals and falsified summary or reopen counts. The history is capped at 100 entries and is **not** server-persisted, cryptographically signed, or an independent hardware attestation.
- Source inventory must be newer than the worklist **and** the preceding ledger review, and at most five minutes old at export. Snapshot changes invalidate all in-memory marks. An imported historical owner action never certifies the current reading.
- Retain the original Build 110 worklist and each downloaded review securely to preserve the chronology. For a new worklist, begin a new ledger.

## Engineering verification

- `npm run typecheck -w @rosevear-ai-hub/web`
- `npm test -w @rosevear-ai-hub/web`
- `npm run build -w @rosevear-ai-hub/web`
- CI development and production gates must pass independently; the protected `main` revision must match the tested source tree.

## Rollback

Revert the Build 111 UI import and new pure utility files from the repository and rebuild the PWA. No schema, backend or Windows migration is involved. Previously downloaded owner-ledger JSON remains a separate private file. Any real-world recovery/retirement action must be evaluated on site by its owner, independently of this UI rollback.
