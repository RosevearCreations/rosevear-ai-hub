# Build 118 — Device & Camera Field Recovery Acceptance Summary

## What this build changes

An owner or administrator can now use **System → Device & camera recovery summary** to consolidate:

- The existing **Build 110** private recovery worklist, including exact Home Assistant device/entity IDs and Hub camera UUIDs.
- Its **matching Build 111** chronological, owner-authored closure ledger, including still-open, reopened and historically owner-attested-closed states.
- One **explicitly requested, fresh authenticated reading** of Home Assistant integrations and registry identities, MQTT availability, Hub camera registrations, previous camera health probes and the private-only go2rtc relay.
- An assigned next-action **role** for each identity, plus separately observed current device function or actual moving video.

This feature is a **field recovery handoff**, not an unattended acceptance engine. A historical closure, healthy API, returned camera registration, recent probe, owner checkbox or passing GitHub Actions pipeline is **not proof** that the correct Windows service actually started after a reboot, an appliance works, or a camera is delivering moving video.

## Step-by-step owner procedure

1. Work from the installed, authenticated Windows Hub client; confirm the original Home Assistant VM, MQTT broker and private HTTPS access are up. Use the **Build 117 post-reboot runbook** separately to verify the restart sequence and installed source version.
2. Open **System → Device & camera recovery summary**. Expand its circled **i** help.
3. Import the private **Build 110 worklist JSON**. Import the exact **Build 111 closure ledger JSON** generated from the same worklist. Their provenance and chronological identities are validated; mismatched files are rejected.
4. Select **Read current authenticated registry**. This calls **six existing GET-only APIs on demand**, without camera scans, commands, writes, health refreshes or scheduled polling. Every earlier session-only observation is cleared on a new reading.
5. Review the four summary cards: current review holds, historical/recently regressed identities, owner-observed this session, and holds still lacking an assigned owner. The status band shows HA, MQTT and private go2rtc separately; if one is down, related identities remain on hold.
6. Use **Unresolved**, **Reopened** and **All historical identities** filters. Read the exact ID, historical status, live status and recommended next supervised action. Note any registered cameras not on the historical worklist; these are **not automatically accepted**.
7. Assign the appropriate **Household owner**, **Workshop operator** or **Camera operator** for the next action. Unassigned identities remain explicit holds.
8. To mark a **current owner observation**, independently operate the specific ordinary HA device/entity, or personally watch **moving video** in the separate **Build 116 supervised private viewer** on the Windows host. The checkbox is disabled unless a recent authenticated exact identity/health reading is present and a matching owner role is assigned. A check is an owner self-report, **not an independently verified signature**.
9. Download the **private owner summary**. The bounded identity-only JSON includes the historical lineage, current status, new/reopened holds, owner roles and fixed next-step recommendations. Its status is **always `FIELD_ACCEPTANCE_HOLD`** and `installed_windows_verified` is always `false`; even zero unresolved rows cannot certify the installed system.
10. Use a separately approved Windows acceptance/handoff process for the physical startup, real client HTTPS/Tailscale access, Home Assistant function and camera video. Any device enrollment, recovery, service restart, registry change or stream repair remains a separate explicit owner action.

## Important interpretations

| Evidence | What it proves | What it does not prove |
| --- | --- | --- |
| Matching Build 110 + 111 | Private historical owner-review continuity | Actual current registry or independently verified repairs |
| Fresh HA entity/device ID reported | Exact identity exists in authenticated current registry | The hardware responded to an actual user command |
| Fresh camera registration and go2rtc health | Identical private stream/relay is configured and recent probe reported healthy | Real moving frames or private client access from a separate Windows login |
| Owner checkbox | Operator says they observed this specific real function or video this session | A signed, tamper-proof acceptance or later reliability |
| Build 118 export | Sanitized, private owner handoff with holds and next-role ownership | Windows field-adoption receipt or permanent server-side record |
| `main` Production GREEN | Repository release jobs passed against an exact source commit | New code installed on the owner PC, VM and equipment recovered |

## Safety, privacy and failure behavior

- The panel appears only in the **owner/administrator System section** and does not fetch until explicitly requested.
- Existing server authentication is used for six GETs only: HA status, MQTT status, HA browser, camera registry, camera dashboard and go2rtc status.
- Browser-session state only. The server receives no uploaded worklist/ledger, and no changes to roles, secrets, devices, automations, camera settings, VM, Task Scheduler, backups or network occur.
- The export excludes service URLs, RTSP credentials, camera hosts, entity attributes, MQTT host/topics, logs, authentication tokens, provider errors and household display names. Exact IDs remain private and should **not** be posted to public GitHub or chat.
- Live availability is **unknown** if a GET fails, returns duplicate/invalid identities, reports offline, or the reading is no longer fresh. The camera check requires private loopback-only go2rtc, enabled encrypted stream and a recent matching healthy probe; actual moving video still needs a human.
- An identity historically owner-attested closed but now absent/unavailable is flagged **live reopened**. Historical open holds cannot silently close just because a current owner selected a checkbox; a subsequent owner-approved closure ledger is required.
- New registry captures clear previous physical/video observation marks to prevent stale acknowledgments from carrying forward. The export explicitly retains independent field holds regardless of apparent current readiness.

## Build verification and next step

Tests cover exact identity comparison, source/receipt provenance reuse, chronological/freshness holds, no automatic calls, role gating, observation reset, privacy and per-camera health checks. Protected promotion is required independently for feature PR, `dev` post-merge, `main` PR and `main` post-merge.

The next queued milestone is **Build 119 — Local Household Password Vault Security Architecture**. It must be security-reviewed before implementing real vault storage, per-user encryption or two-factor access. Do not put passwords in this field summary, in Hub Knowledge, or in chat/AI prompts.
