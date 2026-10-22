# Build 108 — Supervised Device & Camera Field Reconciliation

## Scope and release boundary

This build adds an **owner-supervised reconciliation workbench** to the Hub **Home Assistant → Device & camera inventory recovery** panel. It extends Build 107's bounded read-only evidence rather than restoring databases or changing physical devices. The web app reads four independent sources: HA API status, HA device/entity registry (only when online), Hub camera records/health, and go2rtc listener-safety status. Failed reads are **unknown**, never zero.

The owner may load a previously downloaded `rosevear-device-camera-inventory/v1` baseline and compare it against a newly captured current snapshot. The UI groups missing **HA devices**, **HA entities**, and **Hub camera registrations** by stable identity, with separate owner disposition per missing item:

- review Home Assistant integration or camera discovery/registration;
- check power/network;
- compare a renamed or replaced identity;
- confirm intentional retirement;
- leave unreviewed if unknown.

These are operator **triage labels**, not proof of enrollment, repair, or removal. The snapshot format does not include HA `config_entry_id` or integration ownership, so the app **cannot determine which HA integration is missing**. Review it in Home Assistant under **Settings → Devices & services → Integrations / Discovered**, using HA's records and backup before enrollment. A changed entity ID is not automatically matched to an old device.

## Windows server owner procedure

1. Make sure the existing VirtualBox Home Assistant VM is running and the Hub has authenticated HA access. Keep any Home Assistant and Hub database/VM backups separate and intact.
2. In **Home Assistant** section of the Hub, click **Recheck inventory**, and **Download current inventory**. Save it in a private owner location; it includes household device names and stable IDs, but not tokens or stream URLs.
3. If an actual pre-incident or earlier inventory JSON exists, choose it in **Compare against a previously downloaded inventory**. If none exists, establish today's baseline for future cycles; **do not claim the old inventory is restored** or restore an unverified SQLite database to generate a comparison.
4. Work through the **Build 108 missing-identity review**. For missing HA items, check integration enrollment and device power in HA. For a missing Hub camera, open **Cameras**, use **Review local cameras** to preview ONVIF candidates, and explicitly register *only known selected devices*. The existing bulk-select pathway creates new records disabled for further review; it does not start streams.
5. Cameras are an independent registry: go2rtc online does not imply cameras are registered. For each known registered camera, review disabled/enabled status and configure its credential-bearing RTSP source through the existing protected camera form if authorized. The Build 108 review never stores source credentials.
6. In **Cameras**, run health checks and confirm the local-only transport settings. Observe **moving live video** for each particular camera, not merely an API green status. Return to the recovery workbench and acknowledge each camera separately. The checkbox remains disabled if the camera/stream is disabled, the latest health reading is stale, no live viewer is configured, the health probe is not `online`/`healthy`, the transport is offline, or go2rtc listeners cannot both be confirmed loopback-only.
7. **Download supervised field review** after loading the baseline. The JSON contains two snapshot timestamps, new-identity counts, missing identities with owner-selected dispositions, per-camera readiness and manual playback acknowledgements. It excludes raw HA attributes, hosts, service URLs, video URLs, RTSP secrets and tokens. Keep this handoff private too. A refresh or baseline replacement clears all in-browser review marks.

## Acceptance and safety gates

| Gate | Build 108 behavior | Remaining real-world owner action |
| --- | --- | --- |
| HA registry | Read and compare by identity | Verify absent integrations/discoveries on physical HA VM |
| Missing cameras | Distinguish Hub registration loss from transport | Owner-approved ONVIF preview and selected registration |
| Existing camera health | Read the dashboard and loopback status; block premature acknowledgement | Configure selected camera securely and run authorized probe |
| Live playback | Operator checkbox for each eligible camera; session-only | Personally view moving live video on installed server |
| Backup/restore | No restore, migration, enrollment or control | Verify compatible isolated backups before any supervised repair |
| Evidence export | Identity/disposition/owner-observation-only JSON | Private handoff and independent validation by the owner |

**A GREEN GitHub `main` pipeline certifies the Build 108 code/tests only.** It does not certify the user's Windows Home Assistant VM, missing historical home devices, ONVIF discovery across Deco/Bell network segments, live camera streams or successful backup recovery.

## Verification

Web pure-unit tests assert missing category stability, independent camera eligibility (safe listeners, enabled configuration, recent healthy probe), identity-only report and prevention of ineligible playback assertions. React tests assert read-only network requests, review selections, manual acknowledgement and reset on refresh. Full app typechecking, web build and repository GitHub CI are required before production promotion.

## Next

**Build 109 — Device & Camera Recovery Receipt Reconciliation & Owner Acceptance**: ingest and compare owner-approved field-review receipts, reconcile follow-ups without auto-enrolling devices, and distinguish accepted physical playback from remaining holds. Scope remains contingent on actual exported evidence from the Windows server.
