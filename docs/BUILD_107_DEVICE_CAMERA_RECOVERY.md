# Build 107 — Device Inventory & Camera Recovery

## Why this release exists

The supervised October 21 Windows/VirtualBox restart restored access to the Hub,
Home Assistant and MQTT. The Home Assistant integration initially exposed only
11 system devices and 25 entities; a subsequently configured Samsung TV added
entities. The Hub's separate camera registry remained empty even when go2rtc
reported an online transport. A GREEN service status alone cannot establish
that household devices or live camera playback have recovered.

Home Assistant **Discovered** integrations are offers to configure an integration,
not necessarily enrolled devices. A single integration can expose many devices
and entities. The Hub's ONVIF camera database is independent of Home Assistant's
device registry and of go2rtc's API reachability.

## Delivered UI

Open **Devices → Safe Device Controls → Device & camera inventory recovery**.

1. Select **Recheck inventory**. It reads Home Assistant status/registry, Hub
   camera records, and camera dashboard health independently. It does not publish
   MQTT messages, start scans, restart services, execute controls or write a DB.
2. If Home Assistant registry **and** Hub camera registry are both readable,
   select **Download current inventory**. Save this JSON file privately as a
   dated baseline. Snapshot fields are strictly allowlisted: schema, timestamp,
   device names/IDs, entity names/IDs and camera names/IDs. It excludes URLs,
   IPs, credentials, video, entity state and attributes.
3. After a planned reboot or supervised integration change, select
   **Recheck inventory**, then **Compare against a previously downloaded
   inventory**. The page shows prior identities not currently reported and new
   identities for devices, entities and Hub cameras. Files are read in the
   browser only and are not uploaded to the Hub.
4. Save both snapshots for manual incident comparison. A lost/renamed ID,
   integration disablement or provider reset can change the comparison; a
   missing identity does **not** prove the device was deleted.

An unavailable API, rejected token, failed camera registry request or partial
registry read is **UNKNOWN**, never an invented zero. The export button remains
disabled until both inventory reads succeed. The camera dashboard separately
reports transport reachability, configured streams and healthy streams; it
cannot certify actual human-observed playback.

## Safe owner recovery sequence

1. Review the Build 105 and 106 preflight, encrypted backup/isolated-restore
   evidence, and current VM/HA/MQTT readiness. **Do not** automatically migrate
   or restore the live SQLite database.
2. In Home Assistant, open **Settings → Devices & services → Integrations**.
   Inspect which integrations are configured versus merely Discovered. Configure
   supported integrations only with the owner's authorization. Do not manually
   recreate one Hub item per entity; let Home Assistant's integration enumerate
   its devices and entities.
3. Recheck the Hub Devices inventory. Compare with the earlier private baseline.
   Confirm identity/name changes before treating a record as missing.
4. In **Cameras**, compare the Hub's saved independent registry. If genuinely
   empty, the existing **ONVIF discovery preview** and explicitly reviewed
   **accept selected cameras** path can register a batch. Discovery is never
   performed automatically by Build 107. Review the existing camera worksheet
   and import acceptance gates before any import.
5. Camera registration does **not** prove a usable RTSP URL, stream credential,
   go2rtc producer or playable image. Reconcile approved stream configuration,
   run existing health probes, and manually verify the live video independently.

## Privacy, recovery boundaries and test gates

- Versioned JSON schema `rosevear-device-camera-inventory/v1`; imported snapshots
  have a 1 MB maximum, a 10,000-item/list limit, bounded names/IDs, strict
  duplicate rejection and removal of unrecognized fields.
- Browser-managed, download/import-only comparison. No new migration, file
  storage, localStorage baseline, task, device control or camera import.
- Never call failed/unauthenticated/partial inventories empty; never overwrite
  a known-good baseline automatically; no physical-device acceptance inferred
  from CI.
- Tests: `npm run typecheck --workspace apps/web` and
  `npm run test --workspace apps/web` plus the standard backend, backup and
  Windows desktop CI gates.
- Rollback: revert the UI change; previously downloaded baselines remain
  operator-owned local files. The Windows runtime and database are unaffected.

## Acceptance remaining on the physical server

- [ ] Windows checkout updated to Build 107 release and Hub restarted through
      the existing supervised path without changing scheduled-task ownership.
- [ ] Saved before/after JSON inventory inspected after a real reboot.
- [ ] Home Assistant integrations and devices checked in Home Assistant itself.
- [ ] Camera identities, stream credentials, Frigate optionality and live
      playback independently checked by the owner.

Next: **Build 108 — Supervised Device & Camera Field Reconciliation** with real
field evidence. No automatic bulk re-enrollment or destructive repair is
authorized by this build.
