# Windows verified release slots

This extends Build 060. Do not enroll it by following the older setup steps
until the supervised bootstrap below has passed. A GREEN checkout alone does
not identify the code already loaded by a running Python process.

## Scope

The controller stays in the existing main checkout. Candidate source, a private
Python environment, Node dependencies, a retained Node executable and the built
frontend live under `logs/hub-deployment/releases/<exact-main-SHA>`. The controller
never pulls into the live checkout, upgrades its `.venv`, edits `.env`, replaces
data, migrates a database, or calls the full Windows server startup orchestrator.
Before backup/adoption it checks that the configured SQLite file matches the
backup source, returning only a boolean and never exposing the database URL.
It does not restart Home Assistant, MQTT, Ollama, cameras, certificates or networking.
Staging is file isolation on the same trusted computer, not a security sandbox
for malicious code. Repository authors and reviewed GREEN main are trusted.

## Preparation without downtime

Run `scripts/hub-auto-update.ps1` for a GREEN/runtime preview; `-Stage` also
prepares and tests a release without activation. Both leave running processes
alone. The official main push must have all five required jobs completed and
successful on the exact SHA. A PR success, old run, skipped job or duplicate
required job does not count. No Git token or inbound connection is added.

The slot uses a non-editable backend install and `npm ci`. If a release has no
root Node lock, an isolated lock is resolved first and retained. Python package
inventory, Node lock, interpreter executable, installed packages, source and
built assets are fingerprinted. Failed preparation is preserved under `failed`
and a later pass can retry; it is never activated. At least 5 GiB free is required.
Do not relocate a prepared Windows venv. Retain its original absolute path and
the matching base Python installation; an interpreter executable change blocks
activation until preparation is repeated.

## Required supervised bootstrap

1. Preserve the stash, local startup/client scripts and their independent backup.
   Inspect the actual listener processes as administrator, including Python's
   venv launcher/child relationship and npm's normalized Vite path. Never kill
   a process based only on its executable name or port number.
2. Create an encrypted Hub archive and rehearse its restore to a new scratch
   directory. Preserve its metadata evidence, original archive and separately
   escrowed passphrase. Keep an off-machine copy. The archive excludes `.env`,
   master keys, OS, installed software and external systems; retain those
   separately when disaster recovery is required.
3. Compare the **actual database revision**, not only migrations between Git
   commits, with the intended runtime. Schema drift blocks automatic activation.
   Review and explicitly approve any initial migration/cutover in a separate
   stopped-Hub procedure. Never use the unattended controller for migrations.
4. Establish a healthy retained baseline with the same schema as the candidate.
   A source checkout and passing unit tests do not prove that a legacy runtime
   can be rolled back after a database change. Initial schema changes need a
   separate verified data rollback plan and a fresh stopped-backend checkpoint.
5. Promote shared code through feature PR -> dev -> main, with CI at each gate.
   Pin the exact promoted GREEN SHA for supervised activation; never directly
   push either protected branch. Backend version may remain unchanged across
   several releases, so commit/process identity is checked independently.
6. Review the local `Start-RosevearHub.ps1` adapter. Before managed enrollment,
   it must delegate to `hub-recovery.ps1 -SkipCamera` whenever `active.json` or
   `activation.json` exists. Preserve its previous bytes and full-server startup
   behavior. Do not run the legacy client restart shortcut during maintenance.
7. In a **private local console**, use the controller Python to run
   `scripts/hub_private_backup.py provision --repo-root <live-root>`. This is a
   separate explicit enrollment: it stores a current-user DPAPI-encrypted key,
   never a plaintext passphrase file. Keep the passphrase in a separate vault.
   Run the helper's `create` action and verify a real archive before scheduling.
   The controller will create and restore-verify a fresh encrypted archive
   before every actual adoption, without asking for the passphrase again.
8. Perform the supervised first activation with `-Apply -ExpectedCommit <SHA>`.
   The first activation additionally needs `-BaselineCommit <retained-SHA>`;
   deployment-control changes require `-ReviewedControlChanges` bound to that
   exact expected SHA. Verify backend `/version`, `/health`, the frontend release
   marker, authenticated read-only app behavior, task health and rollback.
9. Only after acceptance, run `install-hub-auto-update.ps1 -Install` as the
   appropriate administrator. It requires healthy managed services, an enabled
   Recovery task and a provisioned backup key. It registers a local Application
   event source and an hourly, two-hour-limited Interactive/Highest task. The
   existing Recovery task is neither disabled nor replaced by the updater.

The tasks require the same Windows user to be signed in. Unattended operation
without a signed-in user needs a separately approved service/logon design;
this release does not change Windows credentials or automatic sign-in.

## Activation and automatic rollback

Preparation and activation have separate locks, so normal recovery is available
while dependencies and tests run. The recovery script and activation share a
short maintenance lock. No task-disable/task-enable operation is needed.

Before stopping anything, the controller requires a fresh real restore-drill
report, matching encrypted archive hash, candidate and fallback fingerprints,
matching live schema, exact GREEN main, verified loopback listener identities
and unambiguous PIDs. It records the previous/candidate SHA in an atomic durable
journal, rechecks PID creation time, then stops only those verified listeners.

The backend starts from the retained slot's non-editable Python packages while
its working directory stays at the live root, preserving `.env` and relative
data paths. Its static web path points at the slot build. Vite **preview** serves
the built frontend on strict loopback port 5173, using the retained Node binary.
The browser page and an independently installed Tauri executable are not OS
processes restarted by this controller. Open pages may need normal refresh.

Acceptance requires backend version, backend slot process identity, HTTP health
and the frontend's exact SHA marker. Only then is the active pointer committed.
Failure starts the previous retained source and Python/Node environment, checks
health, and records `ROLLED_BACK`. A failed SHA is quarantined from hourly retry;
a newer GREEN SHA can proceed, or an operator can explicitly approve a retry
with both `-RetryFailedRelease` and `-ExpectedCommit`.

If the controller terminates mid-activation, Windows releases the maintenance
lock. The next Recovery pass sees the uncommitted journal and retries rollback
before normal startup. A blocked/failed rollback remains `ROLLBACK_FAILED` with
the previous slot retained; unknown or unhealthy legacy listeners are not killed.
Recovery starts a missing managed service without duplicating a verified existing
one. It does not automatically kill a listener merely because its health fails.

## Failure reporting and manual rollback

Read `logs/hub-release-adoption.json`, the metadata log, the activation journal,
and local backend/web stdout/stderr logs. Fixed step names, exit codes and
operator remedies are recorded; child output and raw exceptions are not copied
into release reports. Runtime logs are local and must be reviewed for secrets
before sharing. The scheduled wrapper writes Application event 610 and attempts
a signed-in user's desktop notification on actionable failure. Repeated identical
alerts are suppressed after an event is recorded. Windows notification settings
can suppress balloons; task result, event and status JSON remain the evidence.

To deliberately return to the journal's retained previous release, invoke
`hub_release_manager.py rollback --repo-root <live-root>` only after operator
approval. This stops the verified Hub listeners and is a disruptive operation.
It changes the active pointer, never force-resets Git or reinstalls dependencies.
Retain the full candidate and previous slot at their original paths. Do not prune
either slot, its Node packages, venv or base Python installation while needed.

Automatic rollback does **not** restore data or reverse migrations. An initial
schema-changing failure requires stopping only Hub and its restart launchers,
quarantining current data, restoring the approved archive to a NEW directory,
checking it and explicitly switching approved files. Never overwrite live data
as a rehearsal. Keep the original master encryption key and configuration safe.

The backup archive and DPAPI key on this computer are not protection against
complete disk loss or a compromised Windows account. An off-machine archive and
independent passphrase/master-key escrow remain required operational safeguards.
