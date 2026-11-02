# Build 224 — Backup Inventory, Restore Dry-Run & Disaster Recovery Checklist

The owner/administrator **System → Backup inventory & safe restore rehearsal** panel is read-only. A manual button requests local metadata about the expected `logs/private-recovery` directory. It observes only bounded, expected archive/report filenames and coarse modification times. It refuses symlinked directories and files. It **never reads** `.hubbackup` content, `.json` report content or `backup-key.dpapi`, and it never decrypts an archive, starts a backup, launches a restore, edits Windows startup or copies secrets. Missing directories and failed measurements read **unknown**, never zero.

The panel lists expected inputs from the existing Build 047 snapshot mechanism (SQLite online database snapshot, knowledge files and go2rtc configuration), excludes `.env` and root credentials, and labels integrity, last successfully verified restore, retention configuration and off-machine copies **not independently verified**. Archive file presence or an old `*-verified.json` name alone is not a verified recovery receipt. The owner must examine authentic evidence separately; this UI makes no green restore claim.

The session-only checklist guides recovery preparation, preserving an original installation, using a separate blank scratch directory, rehearsing the existing `python -m rosevear_ai_hub.disaster_recovery synthetic` flow and, when independently authorized, the existing `archive` verifier. Checking a box records no database decision and never authorizes an actual cutover. The actual restore tool already refuses existing target roots, validates encrypted content and database integrity, and cleans temporary rehearsal directories. This build doesn't call it from the browser.

## Windows owner verification

1. As owner/administrator, open System, confirm no inventory request occurs until clicked, and manually sample the directory. Compare the reported counts and timestamps to the **installed Windows root**, not source checkout. An unexpected working directory may show not found; investigate rather than treating it as zero backups.
2. Check that a synthetic rehearsal in a disposable scratch directory completes and cleans up. If using a real encrypted archive, privately verify archive hash, authenticated decryption and SQLite integrity using the documented archive drill; never put passphrases in chat or the UI.
3. Confirm off-machine encrypted copies, key escrow separation, retention expectations and rollback preservation using independent evidence. Do not claim green restore readiness just because an archive/report file exists.
4. Switch to a household/read-only account and confirm the endpoint denies access. Test directory absent, directory symlink, archive link, bad/partial metadata and network/server timeout.
5. Verify the session checklist resets without modifying audit, backup files, keys, Windows services, startup tasks or installed Hub state.

QL-275 remains **Under Review / deferred**. GitHub source CI GREEN is separate from installed-device recovery acceptance.
