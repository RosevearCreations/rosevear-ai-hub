# Build 050 — Disaster Recovery Drill

## Scope and safety

Build 050 introduces two **operator-initiated, non-destructive** recovery
rehearsals. Both restore into a NEW temporary directory, verify its contents,
discard the recovered plaintext afterward, and never overwrite the live Hub.
No backup schedule, Windows task, service restart, remote endpoint, paid
service or automatic restore is introduced.

- **Synthetic drill:** creates a throwaway SQLite database in WAL mode, a
  synthetic knowledge document and go2rtc configuration, and a randomly
  generated temporary passphrase. It makes an authenticated encrypted Build
  047 archive, restores it, validates recovered SQLite record, knowledge
  content and camera config, and removes temporary data. It does not read
  private household records.
- **Operator archive drill:** authenticates and restores an existing real
  encrypted backup using a separate passphrase file, validates all SHA-256
  manifest hashes, SQLite integrity and presence of schema tables, checks
  for accidentally included .env and root.key, then removes plaintext
  from the selected scratch folder on completion.
- The optional evidence report is a NEW JSON file containing a PASS flag,
  timestamp, drill type, archive SHA-256, file/byte counts, and SQLite
  table count. No passwords, private paths, account names, DB rows, camera
  URLs or secret values are written. A failed/refused drill never publishes
  successful evidence; an existing report cannot be overwritten.
- Tests cover wrong passphrases, tampering, missing scratch folder,
  existing evidence file, live-data immutability, and scratch cleanup.
- Existing Build 047 validation rejects malicious tar paths, symlinks,
  duplicates, corrupt SQLite and existing restore destinations.

**GitHub GREEN only verifies the synthetic code workflow, not real-data
recoverability, restored external services, or a full Windows PC rebuild.**

## Windows server: run safe synthetic recovery test

After updating the server to a verified Build 050 main commit, use the
existing virtual environment. Run in PowerShell **on the server** (not
Templar). These operations do not stop Home Assistant, MQTT, Ollama,
Tailscale, Caddy, cameras or go2rtc:

    cd C:\Users\Ree\rosevearaihub
    $work = Join-Path $env:TEMP "RosevearRecoveryScratch"
    New-Item -ItemType Directory -Force -Path $work | Out-Null
    $evidence = Join-Path $env:USERPROFILE ("Desktop\hub50-synthetic-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
    .\.venv\Scripts\python.exe -m rosevear_ai_hub.disaster_recovery synthetic --work-dir "$work" --evidence "$evidence"

Expect: "Recovery drill PASS: synthetic_only". Review the metadata-only
report locally. The selected scratch folder should contain no NEW files
after success. Never delete pre-existing or unknown scratch-folder files.

## Later: rehearse an actual encrypted backup

Use only after there is a genuine Build 047 encrypted .hubbackup archive
and a protected separate passphrase file. The example D: drive and
filenames **must be replaced with actual verified locations**. Choose
a BitLocker-protected recovery volume with adequate free space for
decrypted temporary recovery. The passphrase file must never be copied
into GitHub, screenshots, chat, browser storage or the evidence report.

    cd C:\Users\Ree\rosevearaihub
    $work = "D:\RosevearRecoveryScratch"
    $archive = "D:\RosevearBackups\hub-REPLACE-WITH-REAL-BACKUP.hubbackup"
    $passphrase = Join-Path $env:USERPROFILE "hub-backup-passphrase.txt"
    New-Item -ItemType Directory -Force -Path $work | Out-Null
    $evidence = Join-Path $env:USERPROFILE ("Desktop\hub50-real-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
    .\.venv\Scripts\python.exe -m rosevear_ai_hub.disaster_recovery archive --work-dir "$work" --archive "$archive" --passphrase-file "$passphrase" --evidence "$evidence"

The successful evidence status is operator_archive, not synthetic_only.
The test does NOT replace the live Hub database. Private plaintext is
temporarily written on the chosen recovery disk; protect its Windows
account and encryption, and respond safely if cleanup fails. A successful
archive-only rehearsal is not a test of Home Assistant or Windows recovery.

## If an actual installation has failed — manual cutover only

1. Identify the failure and isolate malware/compromised hosts. Do not
   restore secrets onto an untrusted computer or continue using suspect
   encrypted files without independent verification.
2. Record the last known good backup time, matching application commit,
   version, Alembic schema and master-key escrow. Make an offline copy
   of damaged/active files before changing anything.
3. Stop the Hub API and its automatic restart task during manual cutover;
   leave unrelated services alone unless necessary for safety.
4. Use the Build 047 restore command to a brand-new directory, inspect
   the validated files, and only then deliberately place the recovered
   database into data/rosevear_ai_hub.db and selected data/knowledge and
   data/go2rtc files. Do not overwrite the current installation as a
   test; record each replacement and preserve a rollback copy.
5. Restore SECRET_ENCRYPTION_KEY separately (not included in encrypted
   archives), review database migrations, then start only Hub API.
6. Test account login/roles, read-only knowledge lookup, integration
   health and camera preview. Avoid writes to physical equipment,
   smart locks, security systems, CNC/laser/heaters, or business sites.
7. If checks fail, stop the API and return quarantined pre-restoration
   files, then document outcome and time taken.

## Coverage and gaps

| Component | Build 047 backup | Additional proof needed |
| --- | --- | --- |
| Hub SQLite records | Yes | Real archive drill, records and migration match |
| Knowledge originals | Selected local files | Sample content and completeness |
| go2rtc config | If under data/go2rtc | Manual stream checks and secret escrow |
| Windows OS, task scheduler and installations | No | Protected machine image and startup recovery |
| Home Assistant VM / add-ons | No | Native VM/HA backup and restore |
| MQTT broker state | No | Broker settings and persistence copy |
| Ollama models and settings | No | Model inventory and reproducible install |
| Frigate recordings/events | No | Independent backup if Frigate is installed |
| Caddy private CA / Tailscale identity | No | Certificate/key protection, ACL checks |
| Master encryption keys and recovery password | No | Separate offline escrow, never Git |

Frigate was shown OFFLINE in the operator screenshot and is optional.
This build neither installs nor restarts it. The existing camera/go2rtc
functionality is not modified.

**RPO** (maximum tolerable lost data) and **RTO** (time to recover)
are UNKNOWN until the real operator drill. Record archive timestamp,
age of unbacked-up data, drill duration and backup-drive failure
tolerance. No automatic daily backups or off-machine copy schedules
are created by this release.

## Acceptance gates

- [x] Synthetic create → encrypt → restore → SQLite/file verification
- [x] Isolated operator-archive validation and metadata-only evidence
- [x] Fail-closed negative tests and clean temporary-directory behavior
- [x] Linux full-backend and Windows dedicated recovery/CLI CI gates
- [ ] Server-side synthetic drill performed (requires operator)
- [ ] Real household archive + offline passphrase verified (requires operator)
- [ ] Real archive successfully rehearsed on encrypted recovery scratch
- [ ] RPO/RTO and external service recovery obligations agreed
- [ ] Tailscale access controls and Caddy trust review completed separately

References:
- SQLite online backup: https://www.sqlite.org/backup.html
- Python temporary directories: https://docs.python.org/3/library/tempfile.html
- SQLite PRAGMA integrity_check: https://www.sqlite.org/pragma.html#pragma_integrity_check
- CISA backups: https://www.cisa.gov/resources-tools/resources/backup-and-recovery
