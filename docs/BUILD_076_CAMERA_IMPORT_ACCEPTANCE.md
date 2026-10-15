# Build 076 — Identity-Bound Camera Import Acceptance & Local Windows Migration Verification

## Scope and acceptance
Build 076 preserves Build 075's fail-closed conflict checks and adds an expiring, single-use
review receipt bound to the **authenticated owner/administrator user ID**. Only the same
account that previewed the ready subset may confirm it, using the exact reviewed order,
brands, models, locations, methods and evidence notes. Tokens are cryptographically random;
only SHA-256 token hashes, actor IDs, content digests and server inventory snapshots
are persisted. The receipt expires in 10 minutes. Conflicting rows never enter a receipt.

Commit fails closed for:
- A different authenticated account (HTTP 403).
- Altered models, evidence, order or subset, stale server inventory, or a consumed/expired
  receipt (HTTP 409).
- Missing explicit owner acknowledgement (HTTP 422).
- Duplicate camera identity or an import that races with another transaction (HTTP 409).

On success, the receipt is consumed in the **same database transaction** as all imported
unapproved models and their identity-bound audit ledger entries. No existing models,
stream settings, previous approvals or local browser worksheet entries are overwritten.
A preview creates only a short-lived database receipt; it never connects to cameras.

## Installed Windows field acceptance
GitHub CI and migrations on isolated test databases do not establish the owner's Windows
installation is updated. The home-server installation must be validated separately,
without changing Home Assistant, MQTT or existing go2rtc camera streams.

1. Confirm the current Windows Hub release and the repository `main` commit before
   installing. Back up the local SQLite database using the encrypted Windows backup
   workflow and verify the backup is recoverable.
2. Through the existing **managed updater**, install the approved build. Avoid copying
   the Hub DB or restarting unrelated HA, MQTT, Ollama, or camera services.
3. On the same Windows machine, open the owner account in the Hub UI and select Cameras
   → Shared camera inventory → **Inspect installed database**. It must show revision
   `0021` and Schema Ready, but this alone does not prove system runtime health.
4. For optional read-only offline inspection, run from the checked-out project in
   PowerShell (not Bash):

   `py scripts/hub_camera_import_field_check.py --database "C:\\path\\to\\hub.db"`

   Use the actual configured Hub SQLite path; never send private database files,
   tokens or the absolute database path to support. The command opens the file in
   read-only mode and emits no camera names or secrets. Required checks: migration
   `0021`, identity uniqueness, ledger/receipt tables, SQLite quick_check.
5. Confirm preexisting inventory count and approved plans match the baseline before
   any new imports. Confirm HA and MQTT show Connected in the Hub, and existing
   go2rtc/camera status is unchanged.
6. In the **same browser profile** as the Build 073 worksheet, preview legacy cameras.
   Check duplicates, evidence, location, methods and ten-minute expiry. Confirm with
   the same signed-in account. Import only once, then re-preview to verify idempotency.
7. Check new records remain unapproved; inspect individual `imported` audit ledger
   entries and the readiness counts. Check that a second user cannot use another
   account's receipt, that expiry forces a re-preview, and that browser-local data
   remains intact.
8. Record operator acceptance of Windows database status, Home Assistant/MQTT
   continuity and actual camera playback **separately**. Never label the local Windows
   production install GREEN until these field checks are performed.

## Release gates
All five CI lanes for dev/main PRs and each independent post-merge push must pass.
The repo CI GREEN is **not** equivalent to verified Windows host acceptance.

## Next queued candidate
Build 077 — Camera Import Runtime Assurance, Owner Acceptance Evidence & Local Recovery.
