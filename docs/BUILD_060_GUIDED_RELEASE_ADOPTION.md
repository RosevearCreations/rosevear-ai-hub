# Build 060 — Guided Release Adoption & Practical Workflow Acceptance

## Goal and security posture

The owner can opt in **once** to a Windows Scheduled Task that checks for
an exact GitHub `main` SHA with an **independent push CI run where all five
jobs succeeded**. The workstation performs *outbound HTTPS reads to GitHub*;
there is **no inbound remote desktop, SSH, Tailscale API, new secret,
public listener, MQTT device command, Home Assistant VM restart or paid cloud
dependency**. The Hub's local Windows data and home systems remain private.

The Build 060 System page provides separate **owner-marked** Home, Workshop,
Business acceptance cards. Marks are stored in this browser only and can be
copied as a metadata-only note. They are not proof that physical local services,
backups or the scheduled updater passed. Local release records are written to
`logs/hub-release-adoption.log` and
`logs/hub-release-adoption.json`; they are not served as an unauthenticated
endpoint and are not uploaded to GitHub.

The updater is opt-in. **Merging Build 060 to GitHub does not install anything
on the Windows PC.** One local enrollment is still necessary.

## One-time Windows setup (step by step)

1. Confirm a real encrypted Hub backup has been created **and restore-verified**
   using the Build 047/050 runbooks, with the passphrase stored away from the
   backup. Keep `.env`, data, Caddy configuration, certificates, Ollama
   models, Home Assistant VM, MQTT and cameras safe. The updater deliberately
   refuses **all schema-changing GitHub releases**; no unattended migration.
2. On GitHub Actions, confirm Build 060 has been merged and the **independent
   `main` push** run has five green jobs. CI GREEN is not proof that the
   local workstation has updated.
3. On the Windows Hub computer, use the existing working
   `scripts/Run-Hub-Backend-Update.cmd` **one last time** to fetch
   Build 060. Pause *only* the existing **Rosevear AI Hub Recovery** task
   in Task Scheduler and type `PAUSED` when the script requests it.
   If any red text is shown, stop and read
   `logs/hub-backend-maintenance.log`. Build 060 needs **no migration**.
   Re-enable that Recovery task after health verification.
4. Launch the existing **working client update/restart shortcut** if the new
   `System` panel is not visible. Refresh the browser (`Ctrl+Shift+R`).
5. From the updated repository folder, double-click
   **`scripts/Run-Hub-Release-Check.cmd`**. It only inspects GitHub's
   GREEN run and your local Git checkout; it **cannot** update or restart.
   Examine `logs/hub-release-adoption.json`. When Git already matches main
   it should read `CURRENT`; if behind and safe, `READY`; if there is
   a migration or incomplete CI, `HOLD`. Do not enable automation if it
   reports `FAILED`.
6. Before enrolling, verify your Windows **Rosevear AI Hub Recovery** task
   is installed/enabled and that the local Hub browser is served by the
   repository's Vite launcher on `127.0.0.1:5173` (as used by our existing
   `hub-recovery.ps1`). If you use a different frontend process, the
   auto-updater will **refuse to stop an unknown listener** until we
   adjust this for your exact launch. This is intentional.
7. Double-click **`scripts/Run-Hub-Auto-Update-Setup.cmd`**, choose Yes
   and approve any Windows scheduler permission prompt. This installs one
   **Rosevear AI Hub Release Adoption** task, scheduled hourly, as your
   current Windows identity. It does not overwrite existing tasks or configure
   remote access. The `/IT` flag means this task runs **only while that
   Windows user is signed in**; a locked session may work, but logging
   out prevents runs. This is not an always-on Windows Service.
8. In Task Scheduler, find **Rosevear AI Hub Release Adoption**. Verify it
   points to `scripts/hub-auto-update.ps1 -Apply` under your local repo.
   Use **Run** once to exercise it. Refresh the app and check the local
   JSON/log, the backup/recovery task status, API `/health` and web page.
9. In Hub **System**, review the Home, Workshop and Business acceptance cards,
   mark only steps personally observed, and optionally copy the checklist
   summary. Check Windows Event Viewer and local logs on subsequent upgrades.
   Do not copy credentials, .env contents, private LAN URLs, or backup keys
   into issue reports.

## What an unattended hourly pass does

1. Acquire an exclusive local file lock; refuse simultaneous updater runs.
2. Require local **clean main** and the exact official GitHub remote. Read
   the latest official `main` SHA and workflow runs/jobs over HTTPS.
3. Require `main` **push** run, completed/success, same SHA and successful
   `docs-foundation`, `backend`, `web`, `backup-windows`,
   `desktop-windows` jobs. A green PR/old SHA is **not enough**.
4. Fetch `origin/main`, require exact SHA and fast-forward history,
   and block if any pending diff includes `server/alembic/versions/`.
5. Stage source/dependencies, build and test **before** deliberately stopping
   any process. Existing updater refuses tracked edits and destructive Git
   operations; no `reset --hard`, `git clean` or force checkout.
6. Verify and pause **only** the existing Hub Recovery Scheduled Task.
   Inspect the local backend process by known Python path, app invocation
   and `/version`. Inspect the web listener by known local Node/Vite
   command and loopback binding. Unknown listeners cause a **fail-closed** stop.
7. Stop only verified Vite and backend processes. Start the new backend on
   loopback and verify version. Use the existing Hub recovery script to
   start web on strict port 5173. Check API and web health before recording
   `ADOPTED` and resuming the Recovery task.
8. On error write a local `FAILED` record, do not launch duplicates, and
   attempt to restore the Recovery task. On a migration, write `HOLD`,
   do not change the running code or data.

**Important limitations:** PowerShell/npm dependency staging on the same
machine is not transactional. The task **does not promise automatic rollback
of a partially installed Python/Node environment**, nor database reversal.
If activation fails, the recovery task may recover service availability, but
the owner must inspect logs and potentially restore a known-good source/
environment. Automated rollback with verified backup evidence is reserved for
Build 061. Scheduled Task installation and the first live test must be
performed locally. The Vite preview is automatically restarted; a separately
installed Tauri desktop executable or another external launch method is not
automatically replaced or restarted by Build 060.

## Failure triage

- `CURRENT`: SHA matches the approved GREEN main; no restart or migration.
- `READY`: dry-run only; safe pending release but `-Apply` was not requested.
- `HOLD`: still awaiting exact full-green push evidence or a database
  schema change requires operator approval, verified backup, explicit Alembic.
- `ADOPTED`: script verified backend and web HTTP health. Physical
  home/workshop/business acceptance remains separate.
- `FAILED`: read `logs/hub-release-adoption.log`, then
  `logs/hub-backend-maintenance.log` and `logs/hub-recovery.log`.
  Verify tasks, repo origin/branch, dirty files, port owners, npm, Python,
  available storage and GitHub rate limits. Do not repeatedly force-start.

To disable **only** the new task: in Windows Task Scheduler choose
**Rosevear AI Hub Release Adoption > Disable**. To remove it through the
opt-in script, from the repository root run:
`powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-auto-update.ps1 -Remove`.
This leaves the original Recovery task and every Home Assistant/other service
unchanged.

## Tests, sign-off and rollback

- Windows CI parses new PowerShell files and executes no-network policy
  tests: old SHA, wrong event, missing job, skipped job, migration detection,
  wrong origin, foreign/exposed web process rejection.
- Existing five-job Linux/backend/web/Windows matrix is preserved.
- No new API endpoint, SQL migration, credential requirement or cloud service.
- Security concerns: outbound GitHub connection, local task runs as current
  signed-in Windows identity with scheduler permissions, code on approved
  `main` trusted, and logs kept on the PC.
- Windows owner acceptance is a separate unchecked release gate. For errors,
  disable the adoption task and stop work. Do not force migration or overwrite
  `.env`, data or backups. Restore only from an operator-verified backup;
  automatic application rollback is not claimed.

**Next: Build 061 — Release Recovery Assurance & Verified Backup Gates.**
