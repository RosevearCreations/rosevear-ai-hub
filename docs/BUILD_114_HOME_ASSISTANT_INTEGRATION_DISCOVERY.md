# Build 114 — Home Assistant Integration Discovery & Missing Device Diagnosis

## Goal

Help an owner find what is missing from the installed Windows Hub's Home Assistant inventory **without changing the VM, integration entries, device registry, network or physical devices**. Build 113 GitHub CI GREEN remains separate from installed-Hub and physical household acceptance.

## Operator workflow (Windows Hub)

1. Open **Safe Device Controls → Home Assistant integration & missing device diagnosis** while logged in as **Owner**.
2. Import an earlier private **Build 107 device/camera inventory** or **Build 110 unresolved follow-up queue**. Camera entries are ignored. Imported JSON is processed only in the browser session, never uploaded or stored automatically. A Build 110 owner integration label is a clue, not proof.
3. Select **Read fresh HA registry**. This GET uses the existing authenticated Home Assistant browser endpoint; the panel does not run discovery scans or registration. A failed request means counts **unknown**, not zero. The reading must be strictly newer than the imported source and less than five minutes old.
4. Inspect exact-ID outcomes: **missing**, **unavailable/unknown**, and **reported**. Review the live entity `platform` summary only as a hint. A removed, disabled or unreported entity or integration may not appear at all. A physical device may be offline even when the registry identity exists.
5. In **Home Assistant → Settings → Devices & services**, identify the actual owning integration, its alerts, the device's physical power and its network. Batch-select associated missing identities, enter a short owner-confirmed integration name, and assign a group. No name match, host address or platform hint automatically assigns ownership.
6. For each group, record whether the integration entry is **visible**, **needs attention**, **absent**, or **not checked**. If the exact identity is reported, the group is marked visible and the owner actually tests its function on the household system, mark that row **I tested...now**. This check is an owner statement; no device control is triggered by the panel.
7. Download the **private HA diagnosis** JSON. It carries only source type, timestamps, exact IDs, owner-confirmed group, observed integration status, current registry state, session check and unresolved holds. Keep this local and private. Even when every row is owner-observed, the packet retains **FIELD_DEVICE_ACCEPTANCE_HOLD** pending independent field acceptance in subsequent builds.

## Diagnostic interpretation

| Observation | Safe interpretation | Next owner step |
| --- | --- | --- |
| HA registry GET failed | Unknown, not zero devices | Check VM, configured URL/token and read-only registry access; retry |
| Identity missing by exact ID | Not in this current registry reading | Check **Settings → Devices & services**, integration alerts, power/network, identity changes; do not recreate blindly |
| Entity `unavailable`/`unknown`, or all linked device entities so marked | Registry exists; function not established | Inspect integration logs and physical device status |
| Platform reported (`mqtt`, etc.) | A current entity declares this platform | Owner verifies actual integration ownership in HA; not an integration census |
| Reported identity and visible owner-confirmed integration | Only identity plus an owner-checked integration | Explicit real device/entity function check still required |
| Group status absent/attention | An open integration-level hold | Plan supervised intervention separately with backup/safety review |

## Security and limitations

- No new backend permissions, WebSocket commands, schema migrations, extra tokens, frontend persistent storage, automatic device enumeration, HA service calls, pairing, integration reload, integration restore, registry writes or service restarts.
- The preexisting `/api/v1/home-assistant/browser` endpoint supplies current registry and state data; it may not include disabled entities, complete historical integration membership or any offline device no longer registered. Build 114 **does not claim full HA integration enumeration**.
- Prior JSON is limited to 1 MB and validated using the existing Build 107/110 parsers. Credential-like data and URLs embedded in identities are rejected. Build 110 input uses strict timestamps, stages, unique IDs and summary validation. Files are never sent to a remote API from this panel.
- Refresh, new input and failed current reads invalidate review marks. Earlier physical acknowledgments cannot be carried across readings, and timestamps are checked again at export and action time.
- Export is identity-only, with no HA entity attributes, stream URLs, camera addresses, integration config, usernames, tokens, secrets or host information. A current `platform` hint is visible only in session, not exported.
- Acceptance cannot be green purely by a healthy API, an owner-supplied label, an entity state, an old checkbox, a build/test result or an unobserved physical test.

## Verification

- Unit checks: strict allowlisted imports, no camera spillover, exact matching, absent vs unavailable vs reported, platform-hint limitations, stale/out-of-order holds, privacy-safe exports and owner-check boundaries.
- UI checks: no auto-discovery, explicit read-only fetch, batch grouping, owner status and function observations, refresh resets, failed-read unknown, invalid file handling.
- Full web typecheck, full test suite, Vite production build, and GitHub feature/dev/promotion/main workflows must pass independently. Windows desktop artifact is required from protected `main`.
- **Actual HA VM integration enrolment, household device function and physical acceptance require owner supervision on the Windows system**; these cannot be certified by GitHub CI.
