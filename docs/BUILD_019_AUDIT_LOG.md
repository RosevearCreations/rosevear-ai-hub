# Build 019 — Audit Log

## Purpose

Build 019 turns the Hub's existing raw audit-event records into a consistent, searchable,
permission-aware audit system.

The Hub is the system of record for its own users, permissions, confirmations, tool metadata, and
audit records. This build makes those records operationally useful without introducing external
logging services.

## Scope

Build 019 adds:

- a centralized audit sanitizer and recorder
- first-class actor, tool, risk, confirmation, result, and timestamp metadata
- migration/backfill of existing Build 016–018 audit records
- result-status classification for filtering
- Owner/Administrator audit APIs
- actor/tool/event/action/outcome/confirmation/date/search filters
- bounded pagination
- summary metrics
- an Owner/Administrator Audit Log UI
- sanitized argument/result inspection
- audit coverage for confirmed knowledge-document deletion
- migration, permission, sanitization, API, UI, and packaging tests

## Non-scope

Build 019 intentionally does not add:

- remote log shipping
- cloud SIEM integration
- automated audit deletion/pruning
- secret vaulting or token encryption
- secret rotation workflows
- Home Assistant, MQTT, camera, or business connector audit adapters
- arbitrary audit-record mutation

Secret storage and deeper redaction/rotation controls remain assigned to Build 020.

## Central audit writer

State-changing Hub subsystems now use one `record_audit_event(...)` path.

The writer records:

- actor user ID, when a human actor exists
- event type
- object type and object ID
- action
- tool key, when applicable
- risk level, when applicable
- confirmation request ID, when applicable
- sanitized arguments
- sanitized result
- normalized result status
- timestamp

The writer stages the audit record in the caller's transaction. This lets a state-changing tool
operation and its audit evidence commit together.

## Sanitization

Persistent audit payloads are bounded and JSON-safe.

Build 019 redacts values whose key names indicate common sensitive material, including:

- passwords
- secrets
- API keys
- access/refresh/session tokens
- authorization values
- cookies
- credentials
- private keys

Bearer and Basic authorization-looking string values are also redacted even when their field name
is not sensitive.

Large strings, deeply nested payloads, and oversized collections are bounded before persistence.

This is a defense-in-depth baseline. Build 020 expands secret-management and redaction testing.

## Audit schema

Alembic revision `0010_audit_log.py` extends `audit_events` with:

- `tool_key`
- `risk_level`
- `confirmation_id`
- `result_status`

The migration backfills existing records where the information can be derived from Build 016–018
data:

- tool records derive `tool_key` from the audited tool object
- confirmation records derive `confirmation_id` from the confirmation object
- earlier sanitized `tool_key` values are promoted into the first-class column
- earlier result risk levels are promoted when present
- `result_status` derives from existing result payloads

The migration is reversible to revision 0009.

## Result status

Audit results are classified as:

- `success` when `result.ok` is true
- `failure` when `result.ok` is false
- a bounded explicit `status`/`outcome` string when supplied
- `unknown` when no reliable result classification exists

The original sanitized result JSON is retained alongside the filterable status.

## API

Only Owner and Administrator accounts may inspect the audit log.

### Events

`GET /api/v1/audit/events`

Supported filters:

- `actor_user_id`
- `event_type`
- `object_type`
- `action`
- `tool_key`
- `result_status`
- `confirmation_id`
- free-text search across event/object/action/tool identity
- `created_from`
- `created_to`
- bounded `limit` and `offset`

Events are returned newest-first.

### Summary

`GET /api/v1/audit/summary`

Returns:

- total events
- success/failure/unknown counts
- distinct actor count
- tool-event count
- oldest/newest event timestamps

## User interface

Owners and Administrators receive an **Audit** navigation entry.

The Audit Log screen provides:

- event/success/failure/tool-event summary cards
- free-text search
- tool-key filter
- event-type filter
- outcome filter
- actor-user-ID filter
- previous/next pagination
- actor identity
- action/object identity
- tool/risk metadata
- confirmation evidence
- expandable sanitized arguments
- expandable sanitized result
- timestamp

Household and Read-only users cannot access the audit API or Audit navigation.

## Current audited paths

Build 019 normalizes the existing audit writers for:

- owner bootstrap
- login/session creation
- logout/session revocation
- user creation
- user updates
- tool-registry enable/disable changes
- confirmation request
- confirmation approve/reject
- confirmation expiry
- confirmation consumption
- confirmed knowledge-document deletion

Later builds must use the same central recorder for new state-changing capabilities.

## Security impact

Build 019 improves traceability while reducing sensitive-data persistence risk:

- raw passwords are never written to audit records
- common token/secret fields are redacted centrally
- authorization-looking values are redacted
- only privileged roles can inspect audit records
- audit rows remain append-only through the application API
- state-changing tool execution carries tool/risk/confirmation evidence
- no external logging endpoint or new network exposure is introduced

The current security model retains a 180-day audit-retention target. Build 019 does not silently
prune records; automated destructive retention is deferred until backup/retention operations are
explicitly defined.

## Tests

Build 019 verifies:

- nested sensitive-field redaction
- bearer-value redaction
- payload bounding
- central writer metadata
- result-status derivation
- Owner audit access
- actor/tool/outcome/search filtering
- pagination
- summary metrics
- Household User denial
- migration schema
- historical audit backfill
- migration downgrade
- Audit Log UI
- Windows/Tauri packaging

## Rollback

1. Roll application code back to Build 018.
2. Downgrade Alembic revision 0010 to 0009.

The downgrade removes the Build 019 filter columns and indexes. The original audit-event rows,
actor IDs, event/object/action fields, sanitized arguments, results, and timestamps remain because
the `audit_events` table predates Build 019.

## External setup

No external service, API key, OAuth application, secret, hosted logging system, or paid
subscription is required.

## Next build

**Build 020 — Secret Management**

Build 020 will add environment-secret guidance, encrypted persisted token storage where practical,
redaction tests, and rotation documentation.
