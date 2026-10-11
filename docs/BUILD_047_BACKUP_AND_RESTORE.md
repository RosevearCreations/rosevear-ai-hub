# Build 047 — Encrypted Backup and Safe Restore

## Scope / safety decision

Build 047 adds a **local, explicit, encrypted recovery workflow**; it does not install a Windows Scheduled Task, upload data to a provider, grant an AI agent access to backups, or overwrite the working server. No new paid hosting or secrets are required.

- The SQLite database is copied using SQLite's **online backup API** (safe when WAL is enabled); the copied database must pass PRAGMA integrity_check.
- User-uploaded originals from data/knowledge and the local data/go2rtc configuration directory are included. All archive file paths and SHA-256 content hashes are verified.
- Source .env, encryption master keys, passphrase files, Caddy's private certificate authority, full Home Assistant VM, MQTT broker storage, Ollama models, logs, binaries, cloud business systems, and desktop OS are NOT included. They require a separate protected backup plan.
- The output format is a single .hubbackup file: random scrypt salt + AES-256-GCM nonce + streamed ciphertext + authentication tag. An incorrect passphrase or modified file must fail authentication. Never rely on compression or the .hubbackup filename alone for confidentiality.
- Restore extracts only to a **new nonexisting directory** after decrypting, verifying the full hash manifest and checking SQLite. It refuses symlinks, traversal, duplicate paths, special tar members, existing restore folders, invalid/corrupt databases, and oversized inputs. It does NOT modify or overwrite a live database.
- Source files are briefly staged unencrypted in a temporary OS directory while producing a backup; keep the Windows account secured, do not back up to an untrusted/shared machine, and make sure sufficient free disk space is available. Interruptions may require inspecting/cleaning the operating-system temporary folder.
- Passphrase never goes on the command line, GitHub, log output or in the backup itself. A **20+ byte passphrase file** is required; keep a protected recovery copy separate from the backup, preferably in an offline/password-manager vault. Losing it means the backup is not decryptable.

## Windows test server: make an encrypted backup

In PowerShell on the server, run the following from C:\Users\Ree\rosevearaihub. The passphrase file must be **outside** the repository and accessible only to the operator account. Never post its contents.

1. Confirm the application is responsive and that a regular SQLite database exists at data/rosevear_ai_hub.db. The normal server can remain running for online snapshots.
2. Create a strong recovery passphrase using a password manager or PowerShell's cryptographic random generator. Example below creates a **new plaintext key file** in the current user's private home directory; secure that file and separately store the value in an offline password vault before trusting the backup:

       $secretFile = Join-Path $env:USERPROFILE "hub-backup-passphrase.txt"
       if (Test-Path $secretFile) { throw "Passphrase file already exists; review instead of overwriting." }
       $random = New-Object byte[] 48
       [System.Security.Cryptography.RandomNumberGenerator]::Fill($random)
       [System.IO.File]::WriteAllText($secretFile, [Convert]::ToBase64String($random))
       # Lock down this file using Windows ACLs before leaving it on disk.

   Do not use this example to replace a working passphrase when previous backups depend on it. Ensure the master secret SECRET_ENCRYPTION_KEY (if configured) is stored separately; it is necessary to decrypt stored Hub credentials after a restore.
3. Choose an existing folder on a secure backup drive, for example D:\RosevearBackups (replace with your actual drive):

       New-Item -ItemType Directory -Force "D:\RosevearBackups" | Out-Null
       $backup = "D:\RosevearBackups\hub-$(Get-Date -Format yyyyMMdd-HHmmss).hubbackup"
       .\.venv\Scripts\python.exe -m rosevear_ai_hub.backup create --source-root . --destination $backup --passphrase-file $secretFile

   The script reports file counts/bytes but never prints the passphrase. Files are encrypted before publication and the complete archive is automatically verified.
4. Confirm you can independently verify the file:

       .\.venv\Scripts\python.exe -m rosevear_ai_hub.backup verify --archive $backup --passphrase-file $secretFile

5. Take an **off-machine encrypted copy**, protected from ransomware and drive failure, and regularly repeat restore drills. Daily snapshots and retention scheduling are opt-in operational follow-ups, not automatically enabled by a GitHub push.

## Rehearsal restore (SAFE: no production overwrite)

On the server or an offline Windows recovery PC with compatible Python dependencies:

    $target = "D:\HubRecoveryDrill-$(Get-Date -Format yyyyMMdd-HHmmss)"
    .\.venv\Scripts\python.exe -m rosevear_ai_hub.backup restore --archive $backup --target-root $target --passphrase-file $secretFile

This writes only to a **new** directory containing database/hub.sqlite3 and, when present, data/knowledge and data/go2rtc. The existing installation, services, configuration, and Windows Scheduled Tasks stay untouched.

1. Check the restored SQLite data and sample knowledge files; verify that the expected data and records exist.
2. To restore a REAL failed installation, stop the Hub API and recovery/startup tasks (otherwise the task may restart it). Back up/quarantine existing damaged files instead of overwriting blindly.
3. Move the VERIFIED database/hub.sqlite3 into the live data/rosevear_ai_hub.db location only while Hub API is stopped. Copy recovered knowledge/go2rtc documents deliberately, with a documented change record and appropriate filesystem permissions.
4. Restore the correct original SECRET_ENCRYPTION_KEY separately if encrypted secret/camera rows were in use. Never commit or include it in a backup archive.
5. Apply the matching application's Alembic migration only if moving to a newer program version; confirm that database migrations are compatible. Restart API and verify login, permissions, knowledge search, automations, camera configuration, and backups.
6. Roll back by stopping the Hub again and returning the quarantined pre-restore files. Never apply backup-restore as a live API mutation or autonomous AI action.

## Acceptance, limitations and testing

- Test online SQLite WAL snapshot, full encrypted verify, independent staged restore, wrong passphrase, one-byte ciphertext tamper, source symlinks, traversal tar entry, corrupt DB, and preexisting destination.
- No new DB migrations, cloud storage credentials, background jobs, external providers, or paid tier.
- Replacing the Windows test server build requires a known verified main commit, normal local test suite, and careful process restart so /version becomes 0.0.47. Code GREEN is independent of an actual restore drill against household data.
- This is a first recovery foundation, NOT full-system bare-metal disaster recovery. Plan additional verified backups for HA VM, MQTT and other external source systems, OS/startup scripts, credentials and certificate trust.

Official references:
- SQLite online backup: https://www.sqlite.org/backup.html
- Python sqlite3 backup: https://docs.python.org/3/library/sqlite3.html#sqlite3.Connection.backup
- Python cryptography AES-GCM: https://cryptography.io/en/latest/hazmat/primitives/symmetric-encryption/


## Release record

- **Dev verification:** GREEN on the final Build 047 tree; backend lint/format/tests, web tests/build, docs checks and Windows desktop/recovery checks passed.
- **Production promotion:** PR #115 — `Build 047 — production promotion: encrypted backup and safe restore`.
- **Production commit:** `b6c5a7adde6d831f8df4e057dbe886f07c2446f4`.
- **Production tree:** `ab12137e10f6f3c4a15003690b8fc8feeaf25f03`, identical to the verified dev candidate tree.
- **Main Production CI:** GREEN, workflow run `38155340556`.
- **Version:** `0.0.47`.
- **Remaining operator acceptance:** perform an offline recovery drill on the Windows test server using a real encrypted backup. This is deliberately separate from code promotion and must not overwrite the live Hub.
- **Next queued build:** Build 048 — Performance and Resource-Budget Review.
