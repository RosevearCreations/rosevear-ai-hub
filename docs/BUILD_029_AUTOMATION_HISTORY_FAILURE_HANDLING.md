# Build 029 — Automation History and Failure Handling

## Status

Complete on `main`.

Release evidence:
- verified dev gate: run `37850602230`
- feature promotion: PR #42
- feature merge: `6564d8511214da4fce0625345904cfa994299651`
- verified feature main Production gate: run `37851620839`

## Scope

Build 029 makes the Build 027 `automation_runs` evidence usable for operations and closes failure
recovery gaps without expanding automation authority.

Implemented:
- authenticated, paginated run history
- automation/status filtering
- aggregate success/failure/interruption/skip/running summary
- automation names and run duration in history responses
- operator-visible execution history in the Automations workbench
- restart recovery for orphaned `running` rows
- deterministic `interrupted` status
- per-run failure classification and safe generic unexpected-error evidence
- containment of unexpected action failures to the affected run
- cooldown protection after interrupted runs
- explicit no-auto-retry policy

## Status semantics

- `running`: deterministic action sequence has started
- `success`: all actions completed
- `failed`: execution stopped on a deterministic or contained unexpected error
- `skipped`: trigger matched but deduplication/cooldown prevented execution
- `interrupted`: a prior process stopped while the run was still marked running

An interrupted status does not mean the remote physical action definitely failed. It means the Hub
cannot prove completion from local evidence after restart.

## Failure handling

Failed and interrupted runs are never retried automatically.

This is a safety boundary, not a missing feature. A Home Assistant call can change a device and then
lose its response, or the Hub process can stop after one action in a multi-action rule. Automatic
replay could therefore duplicate a real physical effect.

Instead:
1. preserve evidence
2. mark the run failed/interrupted
3. keep interrupted runs inside cooldown protection
4. require the underlying issue to be corrected
5. wait for a new source event to trigger normal deterministic evaluation

## Restart recovery

At Event Engine startup, Build 029 queries existing `running` rows. Each is:
- closed with `completed_at`
- changed to `interrupted`
- given `failure_kind=runtime_restart`
- marked `automatic_retry=false`
- marked as potentially partial
- audit-recorded as `automation.run.interrupted`

No action executor is called during recovery.

## Unexpected failures

The Event Engine already converted known safe-execution errors into failed runs. Build 029 also
contains unexpected per-rule action exceptions. The detailed exception remains in server logging;
the durable/user-visible run stores the generic message `Unexpected Event Engine action failure.`
and `failure_kind=unexpected_error`.

This keeps one bad rule/action from escaping into the event worker and avoids copying arbitrary
internal exception text into history.

## API

`GET /api/v1/automations/history`
- optional `automation_id`
- optional `status`
- `limit` 1–200
- non-negative `offset`
- newest first

`GET /api/v1/automations/history/summary`
- total runs
- counts for each status
- combined failed + interrupted count
- distinct automations with failures
- newest run and latest failure timestamps
- `automatic_retry_enabled=false`

The existing runtime endpoint also reports `recovered_interrupted_runs` for the current process.

## UI

The Build 029 Automations workbench adds:
- execution-history summary
- status filter
- recent run cards
- event source
- duration
- completed action count
- failure kind/error
- expandable bounded run evidence
- prominent no-auto-retry guidance

## Privacy and security

Build 029 does not widen the Event Engine action set. Build 023 safe-control policy and Build 027
executor restrictions remain authoritative.

MQTT history still contains a payload fingerprint rather than plaintext. History is authenticated.
Unexpected raw exception text is not persisted to the history surface.

## Tests

Acceptance coverage verifies:
- filtering and aggregate history counts
- restart recovery to `interrupted`
- recovery audit evidence
- no automatic replay during recovery
- unexpected action exception containment
- generic persisted unexpected-error text
- interrupted cooldown protection
- workbench visibility of failed-run evidence and no-auto-retry guidance

## Migration

No migration. Build 027 already created the required columns and `status` is a bounded string.

## Non-scope

Build 029 does not:
- auto-retry failed physical actions
- add a manual replay button
- add notifications (Build 030)
- change Rule Schema v1
- expand tool risk permissions
- add a credential, cloud dependency, or paid service

## Rollback

Deploy the prior application version. No schema downgrade is required.
