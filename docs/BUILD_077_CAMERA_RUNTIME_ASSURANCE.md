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
