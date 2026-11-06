# Build 255 — CI SLA baselines and Windows installed-release evidence handoff

## Scope and retained security checks

Build 254's reviewed `dev` PR, reviewed `main` PR and independent `main` push
remain the **only three** `foundation.yml` triggers per normal promotion. The
five separate required jobs (`docs-foundation`, `backend`, `web`,
`backup-windows`, `desktop-windows`) are unchanged and remain fail-closed.
`ci-budget` still fails unless **all five** jobs pass. No protected check or
Windows regression is skipped and no scheduled or workflow-run trigger is added.

Build 255 adds one read-only history-summary **step inside** `ci-budget`, not a
new workflow/job. That step retrieves at most the 50 most recent foundation
workflow runs, and detailed jobs for at most 12 completed recent runs after the
Build 254 main-push rollout at `2026-11-05T13:35:00Z`:

- Counts post-rollout PR and push events and flags any recurring `dev` push
  workflow. The history window is explicitly labelled page-limited unless
  the rollout date has been reached in the fetched page.
- Rechecks exact five-gate job identities, success status and timestamp integrity
  for each accepted sample. Failed, incomplete and missing-job runs are excluded
  **and counted**, not disguised as healthy history.
- Records nearest-rank p50/p95 longest required-job queue and required-gate wall
  time, with the existing observational budgets of 300s queue and 900s wall.
  Budget overruns are transparent warnings, not a bypass of required checks.
- Starts with `INSUFFICIENT_VERIFIED_SAMPLES` until three complete successful
  five-gate runs exist. Any unavailable Actions history is labelled
  `HISTORY_UNAVAILABLE_NOT_ACCEPTED`; no fictitious metrics or service-level
  acceptance are generated.

The run summary in GitHub Actions is the auditable baseline and trend table.
Compare successive summaries; they describe sampled workflow performance, not
future queue guarantees. The feature PR → `dev` push duplicate eliminated by
Build 254 represents one fewer workflow execution per normal promotion (four
to three), a structural 25% reduction. Actual queue-time savings must be read
from successive measured summaries rather than assumed.

Local contract tests: `node scripts/ci-foundation-contract.test.mjs`,
`node scripts/ci-run-budget-254.test.mjs`, and
`node scripts/ci-trend-255.test.mjs`.

## Windows release and Comms connection verification

GitHub `main` GREEN verifies source and build jobs only. It **does not** install
the release, verify a Windows process binary, prove a post-reboot restart, or
activate a private Comms receiver.

On the **actual** Windows AI Hub computer (not a CI runner), after safely
updating the checkout without replacing local modifications, open PowerShell:

```powershell
cd C:\Users\ree\rosevearaihub
git status -sb
git pull --ff-only origin main
powershell.exe -NoProfile -File .\scripts\inspect-hub-release-255.ps1
```

If `git pull --ff-only` rejects uncommitted changes or diverged history, STOP.
Do not reset local files, delete the untracked `package-lock.json`, or force
the update. The inspector is safe to run against the current installed version
to produce an honest old-version observation.

The inspector combines only already existing, tightly scoped checks:

1. The Build 253 read-only web artifact SHA-256 / path and listener/task
   classifications; no raw user paths, process IDs or command lines exported.
2. QL-339A `--probe-local`: one loopback-only GET to the existing Hub health
   service (`http://127.0.0.1:8765/health`). It **does not** contact Comms Hub.
3. QL-339B `--inspect`: offline Boolean checks that the already enrolled
   encrypted signer and public candidate files exist. It **does not** open a
   private key or ask for its passphrase.
4. Git HEAD and clean/dirty classification from the local checkout as **source
   candidates**, never proof that a running process uses that commit.

It prints one sanitized JSON object, schema
`rosevear.hub.build255.windows-release-handoff.v1`. Owner can save that output
locally for an independent on-device reviewer. If any probe fails, the result
is `NOT_VERIFIED` and must not be described as a working connection. Every
report hard-codes the following limitations:

- `comms_connection: "DISCONNECTED / HOLD"`
- `private_receiver_verified: false`
- `original_issuer_signature_verified: false`
- `independent_witness_verified: false`
- `installed_release_attested: false`
- `process_attested: false`
- `owner_post_reboot_accepted: false`
- `relay_activated: false`, `changed_anything: false`, `remote_requests: 0`

The latest owner-observed QL-339A check returned
`LOCAL_HUB_HEALTH_VERIFIED_TEST_ONLY`; QL-339B showed both signer and public
candidate present, but explicitly `connected: false`. This is **good local
readiness, not a remote handshake**. It does not satisfy dual-original-owner
authority, private receiver readiness, independent signed identity pinning,
database enrollment or a supervised TEST witness.

The AI Hub client has two separate views:

- **Local service diagnostics → Refresh checks:** tests the local Hub API and
  optional local services. `http://127.0.0.1:8765/health` reporting `status: ok`
  means local backend readiness only.
- **I.T. → Rosevear Comms Hub connection → Run local Comms Hub readiness check:**
  runs an **offline** contract preflight. Its PASS cannot imply connectivity.

The private Comms peer still requires an explicitly authorized original owner
and receiver setup under `docs/integration/QL339B_WINDOWS_DEVICE_SIGNER_FIELD_HANDSHAKE.md`.
Never paste signer private keys, passphrases, connection strings, local IPs,
Tailscale information, private endpoint details or raw logs into the source PR.
No live connection, device activation, call, SMS, customer data transmission or
background task is authorized by Build 255.

## Release acceptance

1. Feature PR into `dev`: all six jobs green and source SHA recorded.
2. Verify **no redundant dev push run** was triggered for that merge.
3. Release PR into `main`: same six jobs green; no bypass of Windows checks.
4. Exact `main` push: independent six jobs green, including Build 255 trend
   summary. Compare current `dev` and `main` tree IDs.
5. Windows: only an actual owner-supervised local observation plus separate
   independent signer/process evidence can raise installed status. Until then,
   keep `INSTALLED_RELEASE_NOT_ATTESTED` and `COMMS_DISCONNECTED_HOLD`.

**Next proposed build — 256:** Windows Installed-Source Owner Retest,
Independent Signed Process Evidence Intake & Comms TEST Receiver Readiness
Decision.
