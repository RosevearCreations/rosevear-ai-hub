# Build 110 — Integration-Level Missing Device Evidence & Camera Recovery Follow-Up Queue

## Why this build exists

Builds 107–109 capture household device/camera inventory, supervised field review, and owner acceptance receipts. Those receipts show **which exact registry identities are still missing**, not necessarily which Home Assistant integration owns a device. A formerly observed video stream is also not proof that it plays now.

Build 110 adds a **local, read-only follow-up queue** driven by a strict Build 109 owner-acceptance receipt and a *later, fresh* Home Assistant/camera registry reading. It groups unresolved work without trying to discover, enroll, switch, restore, or reconfigure devices automatically.

## Operator procedure on the actual Windows Hub

1. Use the normal supervised server startup and verify that Home Assistant, Hub Camera inventory, and go2rtc are available on the intended private network. If a service is unavailable, correct the service prerequisite first; never interpret failed reads as zero devices.
2. Open **Device & camera inventory recovery** in Rosevear AI Hub. Recheck inventory, work through the Build 108 review and Build 109 receipt reconciliation, then download the **Build 109 private owner acceptance JSON**. Keep receipts on trusted private storage, not a public issue, chat, or GitHub commit.
3. Recheck inventory again. In **Build 110 — Group missing integrations and camera follow-ups**, import the Build 109 JSON. Build 110 requires a snapshot with a strictly later timestamp, no more than five minutes old, and no more than one minute in the future.
4. Review the five follow-up categories. A missing device or entity retains its exact identity and is **not** matched by similar names. A previously owner-reviewed retired HA identity remains an exception only while still absent. A retired device that reappears goes back to owner function review.
5. For several devices that belong to one integration, select their HA follow-ups together and enter an **owner-supplied integration group** such as `MQTT`, `Meross` or `Zigbee`. Use **Select all HA follow-ups** only if they genuinely belong to one integration. These labels are operator hints, not imported integration registry proof. Unknown entries stay **Integration unassigned**.
6. For **camera registration** holds, inspect the ONVIF discovery preview and explicitly approve only selected devices in the existing Cameras workflow. For **camera stream/transport** holds, check the loopback-only go2rtc transport, saved stream configuration, and fresh health probe through the existing supervised controls. This Build 110 screen never stores or exports RTSP credentials, camera viewer URLs, or integration tokens.
7. For **camera playback** holds, open the existing Cameras viewer, personally watch moving video, and only then tick the fresh observation box. A previous receipt's playback claim is deliberately ignored. For returned HA identities, verify actual function in Home Assistant before ticking the fresh owner-check box. Rechecking inventory resets current-session group labels and acknowledgements.
8. Download the **private follow-up queue JSON**. The export includes every unresolved identity, its evidence, stage, owner-supplied integration grouping, and the next supervised action. Store it privately. It is an operator worklist, **not** a physical acceptance certificate or a server release receipt.

## Data and security contracts

- Import accepts only `rosevear-device-camera-owner-acceptance/v1`, with a strict one-megabyte bound, valid ordered timestamps, unique scoped identity IDs, unique camera IDs, true booleans, consistent dispositions/owner marks, and a summary that reconciles with evidence rows. Unknown properties are dropped before storage in page state.
- No imported secret-bearing metadata is retained. The follow-up export schema is `rosevear-device-camera-recovery-follow-up/v1` and contains identity/name, evidence/next step, human integration group, and counts only. It contains no camera host, RTSP URL, viewer URL, token, password, or full Home Assistant attributes.
- Current snapshot freshness and ordering are checked again when exporting, so a stale page cannot issue a current receipt. Human marks are session-only and scoped to the current snapshot timestamp.
- No HTTP mutation, camera onboarding, HA enrollment, integration repair, automation command, VM reboot, database restore, or device control is invoked by the follow-up queue. Existing owner-approved Cameras/HA workflows remain the only place for corrective actions.
- A healthy go2rtc probe is **not** enough to acknowledge moving video. A marked video observation applies only to the current safe/fresh reading and only to that exact camera ID. Missing, stale, unsafe and unregistered streams remain holds.

## Release and field acceptance distinction

Passing TypeScript, React tests and all five GitHub Actions jobs on the feature PR, `dev` push, promotion PR and protected `main` push proves **code-release readiness**. It does not install an update on the Windows Hub or independently demonstrate that household devices and cameras were restored. Owner field acceptance remains open until actual integration/device function and live moving-camera video are observed.

## Acceptance checklist

- [x] Imported private Build 109 receipt parsed and allowlisted; invalid/contradictory receipts rejected.
- [x] Fresh, strictly later current registry snapshot required for queue export.
- [x] HA missing/returned identity and owner-reviewed retired exceptions distinguished by exact ID.
- [x] Bulk owner integration labels distinguish unknown integration from explicit human hints.
- [x] Camera registration, stream health, and observed moving playback split into separate holds.
- [x] Refresh invalidates new owner observations; no prior video acknowledgment carries forward.
- [x] Private export includes unresolved follow-ups and no credential/stream metadata.
- [x] Unit and React regression tests cover parser boundaries, stale evidence, camera stages, and bulk grouping.
- [ ] Four independent CI stages fully GREEN and protected `main` tree verified.
- [ ] Owner installs the promoted release on the Windows server and verifies real HA/camera inventory.
- [ ] Owner checks affected device functions and each selected camera's live moving video.

## Next proposal

**Build 111 — Owner-Supervised Integration Follow-Up Closure & Camera Playback Recheck Ledger**: reimport Build 110 worklists, compare later evidence, preserve unresolved owner holds, and maintain an append-only *private* human closure receipt without automatic repair claims.
