# Build 057 — Workshop Equipment & Safety Readiness

Version `0.0.57` — local-first, multi-project workstation and equipment register.

## Scope

- New Owner/Administrator **Workshop** navigation for all projects; workstation records
  (project key, name, hazards, description), equipment registry (activity
  category, location, maintenance date, readiness) and immutable manual
  inspection history per equipment.
- Manual inspection statuses are `observed_ok`, `needs_service`,
  `unsafe`; they map to advisory `review_required`, `attention` and
  `blocked`. New equipment starts `unverified`. No value represents
  approval to operate a machine. Independent safety sign-off remains required.
- Only Owner/Administrator can access the private registry. Input is bounded,
  project/station cross-assignment is blocked, and mutations are audited.
- UI filters projects, surfaces missing inspections, overdue maintenance,
  history and clear warnings for lasers, forges, CNC, electrical, chemicals.
- No machine drivers, actuation, MQTT publishing, automation invocation, cloud
  storage, background monitoring, paid services, or hidden safety bypass.

## Migration and Windows acceptance (operator-owned)

**Build 057 adds additive Alembic revision `0018`** after `0017`.
Before running any new Workshop page on Windows, **verify a genuine encrypted
restorable backup** and inspect the actual local database version. Stop the
API with the existing controlled operator procedure after pausing its recovery
Scheduled Task. Apply pending migrations explicitly with the generic updater
or the `update-hub-backend.ps1 -ApplyMigrations -BackupVerified` workflow.
Do not run migration against a live SQLite process or falsely assume a backup
exists because CI passed. Continue to use the separate client restart script.

After restarting, verify `/version` = `0.0.57`, migration revision
`0018`, create two distinct project keys, register one workstation in each,
verify cross-project assignment is denied, record a blocked observation, then
record an observed-OK observation and verify it still requires independent
review. Test the read-only denial and no hardware action.

The earlier Windows screenshot confirmed loopback Hub `0.0.56` after an
explicit manual recovery. That host has **not** been updated by GitHub CI.
Avoid indiscriminate `Stop-Process -Force`, which bypasses ownership and
safety checks; always use verified stop/restart and controlled recovery.

## Backups and rollback

CI runs upgrade-to-head and schema acceptance tests on isolated databases.
Take a real encrypted backup with an off-host escrowed key before installing.
Rollback by restoring a reviewed offline database backup and compatible code,
not by automatic downgrade of live inspection evidence. No surprise device
state changes are permitted. Next queued: **Build 058 — Business Connector
Operations Workspace**.
