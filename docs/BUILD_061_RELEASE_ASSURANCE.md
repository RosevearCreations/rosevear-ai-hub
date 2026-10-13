# Build 061 — Release Recovery Assurance & Verified Backup Gates

## Purpose

The confirmed login check is useful but **not sufficient** proof of real device health,
completed database migration, an installed automatic updater or a successful rollback.
Build 061 introduces a **read-only operator assurance report** so those different kinds
of evidence cannot be confused. The production source of the report may be GREEN even
when the current Windows server is still running an older or unverified process.

Run `scripts/Run-Hub-Release-Assurance.cmd` on the Windows Hub computer, **only after
the new code has been obtained through a normal safe local update**. It calls
`scripts/hub_release_assurance.py`, which reads only local metadata and an SQLite
revision in read-only mode. It does not contact GitHub, execute a backup, test a real
restore, query Windows Scheduled Tasks, trigger an application restart or install
packages. It neither accesses Home Assistant nor calls MQTT/camera commands.

## Interpretation and operator acceptance

- `managed_release_pointer`: locally recorded SHA is well-formed, not necessarily
  a running process identity or the current GREEN main revision.
- `retained_release_metadata`: active slot's reported SHA/tests flag/schema
  are consistent; the full slot dependency fingerprint must still be verified
  separately by the deployment controller.
- `live_schema_alignment`: the database's actual SQLite Alembic revision matches
  the declared candidate revision. A mismatch is a **HOLD**, not an invitation
  to run Alembic automatically.
- `recovery_journal`: a committed journal with different previous/candidate
  SHAs. An `activating` journal must be recovered before another activation.
- `distinct_same_schema_fallback`: retained manifests describe different
  releases with the same schema. **This is only eligibility**; not a passed
  physical failover, health check, or rollback/re-adoption exercise.
- `private_backup_key_present`: a current-user backup key file exists; this
  does not prove its DPAPI decryption by the current Windows identity.
- `fresh_archive_hash_and_prior_restore_evidence`: the existing restore-drill
  report meets the strict hash/age criteria from the release manager, if present.
  No archive is decrypted/restored by the report itself.
- `real_runtime_and_browser_acceptance`, `live_failover_and_readoption_rehearsal`,
  `separate_machine_disaster_recovery`, and
  `windows_scheduled_task_configuration` are **UNVERIFIED**, never
  automatically marked PASS by reading metadata.

The overall result is always `REVIEW_REQUIRED` even if all metadata checks pass.
Do not interpret its exit code of 0 as permission to enable automatic adoption.
Report is metadata-only, contains no private paths, tokens, connection strings
or file contents, and does not write into the local repo.

## Real supervised steps that still require operator acceptance

1. Confirm current backend `/health`, `/version`, exact promoted SHA on the built
   frontend, authenticated login and current source/slot process identities.
2. Confirm schema `0018` and compatible full feature workflows if following the
   previously reviewed two-checkpoint migration. Preserve any quarantined database.
3. Recheck the separately restored encrypted backup and its passphrase/key access,
   as well as the first and second stopped-backend checkpoints.
4. Run an intentionally supervised rollback to **a different release using the
   same schema**, verify health and browser workflows, then safely re-adopt.
   Never test destructive downgrade on the live database.
5. Check the Windows Recovery task, the proposed interactive hourly adoption task,
   error notifications and the login-session limitation. The adoption task
   should be enrolled only after the earlier steps genuinely succeed.
6. Store an off-machine backup when possible. A D: copy on a different physical
   disk in the same computer does not protect against whole-computer loss.

## Tests / security / rollback

Python tests simulate empty/invalid metadata, schema drift, interrupted journal,
same-SHA (invalid) fallback, missing backup key, malformed JSON and absence of
filesystem writes. Linux backend and Windows backup CI run these tests. The five
normal CI gates remain authoritative for GitHub promotion; none prove a real
home Windows process was restarted.

Build 061 adds no migration, dependency, paid hosting, API route, browser secret,
Windows Scheduled Task or new automated action. Rollback is to revert the
report/shortcut/docs, not the Hub schema or live services.

**Next queued: Build 062 — Managed Enrollment Acceptance & Update Observability.**
