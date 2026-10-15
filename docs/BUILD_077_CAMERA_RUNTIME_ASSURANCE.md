# Build 077 — Camera Import Runtime Assurance, Owner Acceptance Evidence & Local Recovery

## Shipped controls
- Additive Alembic `0022` introduces append-only `camera_import_acceptance_evidence` with
  authenticated **owner** ID, imported/camera counts, server inventory fingerprint,
  installed migration revision, four manual check flags and a decision (hold/accepted).
- Owner-only `GET /api/v1/camera-import-assurance/status` reads local Hub SQLite
  inventory plus latest manual acceptance without contacting cameras, Home Assistant,
  MQTT, or changing go2rtc.
- Owner-only `POST /api/v1/camera-import-assurance/owner-acceptance` records a HOLD
  or accepted manual observation. Acceptance requires explicit confirmation of all
  four checks (verified encrypted backup/recovery drill, HA connected, MQTT connected,
  and unchanged camera/go2rtc status). Both operations reject older inventory
  snapshots and require installed schema `0022`.
- The Cameras page shows an owner-only checklist with manual-record labels.
  Acceptance **never** activates equipment or certifies remote Windows runtime.
- A read-only script compares the live installed SQLite file to a separately
  recovered isolated SQLite snapshot. It checks schema/integrity and aggregate
  camera/ledger/review counts without displaying camera names or credentials.
  It **does not restore, decrypt, replace, migrate or repair** any file.
- The old Build 076 readiness inspector remains compatible with both revisions
  `0021` and `0022`.

## Local Windows field acceptance (must be performed by owner on PC)
1. Use the approved Windows updater for the verified `main` release. Before updating,
   create and verify an encrypted backup with the existing private DPAPI backup
   workflow. Do not post backup passwords, databases, key files or RTSP URLs in chat.
2. Check the Hub UI is connected to its expected local SQLite installation. Cameras →
   Shared Inventory → Installed database readiness should report revision `0022`.
3. Verify Home Assistant (expected local URL `homeassistant.local`) and MQTT still
   report Connected; check existing go2rtc/camera statuses **without** restarting
   services, probing unknown cameras, or activating new transports.
4. Conduct the existing private encrypted recovery drill. If you explicitly extract
   an isolated SQLite snapshot into a restricted temporary folder, compare it with
   the live SQLite file in PowerShell from the project folder:

   `py scripts/hub_camera_recovery_verify.py --current "C:\\path\\to\\live.db" --recovered "C:\\restricted\\isolated.db"`

   This requires two **different** files. A MATCH means only that the selected
   inventory/ledger counts and schema match at comparison time, not that a new
   restoration has been performed or live device behavior verified. HOLD on any
   mismatch; do not overwrite the live database. Prefer the existing encrypted
   archive's independent drill if no isolated recovered SQLite file is available.
5. Sign in as the Hub **Owner**, open Cameras → Build 077 Owner observations, inspect
   local database evidence, check only items actually verified, then record either
   a HOLD or an acceptance. All four flags must be true for acceptance. The
   append-only record contains aggregate evidence and owner ID, no credentials.
6. If the camera inventory changes after acceptance, its snapshot is stale and
   must be reviewed again; newer observations do not rewrite older entries.
7. Keep the Windows PC installation and actual HA/MQTT/camera acceptance
   independent of GitHub CI. Never claim installed production GREEN based solely on
   repository tests, a UI checkbox or a recovery count comparison.

## Fail-safe release rules
- No modification to running Home Assistant, MQTT, go2rtc, cameras, credentials,
  or existing approval ledger.
- Nothing attempts vendor/Alexa stream extraction or automatically installs/releases
  into Windows.
- No remote service health claim is inferred from manually checked flags.
- PR builds need backend/web/docs/Windows-backup/desktop checks GREEN on both branches.
  Independent push CI on `main` must also be GREEN.

## Next proposed
Build 078 — Camera Owner Acceptance Reconciliation & Isolated Recovery Evidence Review.


## Build 077 power-outage regression and reboot startup coverage
The Windows server was observed after the October 15 power outage with healthy Home
Assistant/MQTT/Ollama, but Hub API/Vite/go2rtc offline. The recovery task existed;
`active.json` was absent and `activation.json` reported
`"phase": "supervised_bootstrap"`. The old recovery code treated **any**
activation journal as managed enrollment and failed with
`No managed release is enrolled.`. Manually invoking the verified backend
launcher and web/go2rtc startup recovered the client without DB modification.

Release change:
- `hub-recovery-mode.ps1` distinguishes managed enrollment, exact orphan
  supervised bootstrap, and unknown/malformed journals.
- Exact **supervised_bootstrap + no active release** routes to the existing
  legacy recovery path. Before launching the backend, a successful, non-mutating
  `inspect-schema` must verify checkout and live DB compatibility. The same
  maintenance lock is respected and rechecked. Journal is never deleted.
- `activating` and enrolled managed releases still use managed recovery; unknown
  journal states are HOLD, never automatically bypassed.
- The backend startup uses the verified version-aware launcher rather than
  an unobserved Python spawn. Healthy processes are not restarted; occupied
  ports are not duplicated; HA, MQTT and Ollama are never restarted.
- The existing five-minute scheduled recovery task remains available.
- `install-hub-startup-task.ps1 -Install` adds **one separate sign-in trigger**
  using the same guarded recovery script, with idempotent installation and
  refusal to overwrite an unfamiliar task. This needs a one-time elevated
  PowerShell installation on the actual Windows PC after installing the code.
  A sign-in trigger does **not** start before Windows login. Unattended boot
  before login would require a dedicated Windows service, not this user task.
- Windows CI parses all recovery/startup scripts and runs a pure classification
  regression for supervised bootstrap, activation, malformed and enrolled modes.

Local field acceptance after installing the verified release:
1. Confirm current Hub API, web and go2rtc stay healthy; do not reboot merely
   for a test during active usage.
2. From an elevated **PowerShell** with the updated checkout, run
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-startup-task.ps1 -Install`
   once. It leaves the existing recovery task untouched.
3. Verify `Rosevear AI Hub Startup` is enabled with an at-logon trigger and
   `Rosevear AI Hub Recovery` remains Ready/enabled (five-minute recurrence).
4. A future planned restart/login should restore Hub API on 8765, web on 5173,
   and go2rtc on 1984 without operator commands. Check HA/MQTT/Ollama separately.
5. After confirming local DB backup and schema readiness, record owner acceptance
   with the field checklist. GitHub CI GREEN is not Windows PC acceptance.
