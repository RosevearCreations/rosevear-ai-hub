# Build 063 — Release Health Cohorts & Supervised Recovery Evidence

## Summary

Build 063 extends the Build 062 **owner/administrator-only** System release-status
panel. It shows local release-health events grouped by UTC calendar day for the
last seven days, and it can display an optional explicitly **operator-reported**
rollback/re-adoption checklist. Neither represents automated proof that a live
Windows recovery exercise occurred.

The existing `GET /api/v1/system/release-observability` endpoint remains
owner/admin-only, no-store and **manual refresh**. Its two added objects are:

- `health_cohorts`: daily, recognized `CURRENT`, `READY`, `HOLD`,
  `ADOPTED`, `FAILED`, `ROLLED_BACK`, `ROLLBACK_FAILED` counts. The
  parser reads only up to the last **128 KiB / 512 lines** from the existing
  `logs/hub-release-adoption.log`, returns no raw lines, paths, release
  descriptions, exception text, usernames or credentials, and ignores entries
  older than seven days or beyond a five-minute clock drift.
  The log does **not** contain a trustworthy per-event SHA, so events are
  **not attributed to a release SHA**. The panel marks sampled/corrupt history
  `partial` and counts unparseable lines; it never computes a misleading
  success rate or silently assumes a complete timeline.
- `supervised_recovery`: bounded, schema-validated optional private
  `logs/hub-deployment/supervised-recovery-evidence.json`. It accepts only
  a distinct pair of 40-character release hashes, one declared schema
  revision, a UTC observation within 30 days, explicit operator attestation,
  and six real-exercise checklist booleans. Missing, invalid, incomplete and
  stale reports stay separate from `operator_reported_complete`.
  **Even a complete report always has `machine_verified: false`.**

## Recording an actual supervised recovery

First perform a **real**, explicitly supervised rollback from release B to
**different** same-schema release A and re-adopt B. Do not execute this
exercise solely to make the dashboard green; obtain a current off-machine
backup where possible and an operator-approved maintenance window.

Observe all six checks on the real Windows computer, keeping evidence private:

1. Verify baseline healthy API/frontend/process identity for release B.
2. Roll back to A with the existing guarded controller; verify runtime health
   and the unchanged compatible SQLite schema.
3. Complete authenticated browser acceptance (login alone is not enough).
4. Re-adopt B and verify exact running API/frontend SHA and health.
5. Confirm Windows Recovery task remains correct and can interoperate without
   duplicate starts or stopping unrelated services.
6. Independently verify that the encrypted backup is restorably accessible
   with the required credentials in an **isolated** restore.

The example file
`docs/examples/BUILD_063_SUPERVISED_RECOVERY_EVIDENCE.example.json`
is intentionally all false. Only **after** the actual exercise, privately
copy the template into the ignored runtime location
`logs/hub-deployment/supervised-recovery-evidence.json`, enter the actual
two different full SHAs, actual common schema revision, UTC observation,
and mark **only steps personally witnessed** as true.
Set `operator_attested` true only after reviewing all evidence. Avoid
private notes, names, tokens, file paths, chat transcripts and credentials.
Do **not** commit the completed private record. The local `logs/`
directory is excluded from Git.

The endpoint validates the operator declaration **as data**. It does not
authenticate a human signature, fingerprint runtime processes, independently
restore a backup, or make enabling the hourly updater automatic. Distinct
metadata SHAs do not prove that both releases were genuinely tested, and
future schema migrations still require separate approval.

## Diagnostics, limits, security and rollback

- Missing or malformed local files are `unavailable` / `not_recorded`;
  unknown states/invalid times cannot become successful evidence.
- The parser will not follow symlinked source files or intermediate log
  directories. Archive size and input time windows are bounded. Raw status
  descriptions, private notes and arbitrary fields never appear in JSON.
- The view cannot start/stop services, modify Scheduled Tasks, copy files,
  alter Home Assistant, MQTT, Ollama or cameras, run SQL, trigger migrations,
  enable remote access, install dependencies or send notifications.
- GitHub CI still consists of five independent gates. Unit tests use
  synthetic local files and **never** prove actual household recovery.
- To roll back Build 063 code, remove only the extra cohort/attestation
  display/fields and tests. Preserve the live Hub, database, backups,
  recovery journal and operator-owned evidence untouched.

**Next queued:** Build 064 — Release Incident Triage & Recovery Evidence Continuity.
