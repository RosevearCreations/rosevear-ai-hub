# Build 393 — Existing printer-PC reboot continuity

Verified source gap: setup-printer-pc371 installs a one-shot client, not a scheduled observer. Reboot leaves no persistent observation process. Build 392 associates previously admitted receipts with workshop samples. This increment adds a proposed local opt-in reuse path without changing existing dependencies or key custody.

Inspect checks the existing installation and exact task ownership, with no changes. Enroll is a separate local operator action, only after the existing collector succeeds against an independently approved private HTTPS endpoint and CA. It uses the current Windows user, low privilege, an interactive logon trigger and five-minute repeat with bounded execution, never an administrator password or pre-login claim. Do not run it where a prior enrollment or another observer already exists. Verify the existing private directory ACL and trusted CA first. Never overwrite existing configuration, rotate keys, install Python, control equipment, or alter the Hub, Home Assistant, or MQTT. If enrollment partly fails, retain files and review locally rather than retry blindly. SendOnce reuses the enrolled URL and exact CA digest. No public listener or new cross-app dependency.

Windows CI parses the runner and constructs a non-registering test trigger and principal. The runner rejects unexpected key/config ACL grants or reparse points and serializes its own observations using an exclusive local lock. It does not detect an unrelated legacy collector; the operator must not enroll a duplicate observer. Actual task and post-reboot receipt are not certified by GitHub. The Hub's existing managed release controller retains schema, backup, exact CI and rollback gates; no automatic live migration is authorized.

The existing collector's signed receipt expires after 60 seconds. Five-minute
observations are periodic inventory snapshots, not continuous live status;
HOLD between observations is expected. No receipt freshness is extended.

After source GREEN, from a reviewed local copy of the script, run
`powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\resume-printer-pc393.ps1 -Action Inspect`.
Only if the existing client is present and no other observer is enrolled,
use `-Action Enroll -HubReceiptUrl <approved-private-URL> -TrustedCaFile <existing-CA-PEM>`.
The first signed delivery must succeed. Do not invent the CA or change the
existing signing key. If a partial enrollment remains, inspect its actual task
and files locally; do not delete or re-enroll blindly. Windows Task Scheduler
last result is a local execution indicator, not independently witnessed receipt.
