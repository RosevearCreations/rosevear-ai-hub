# Build 018 — Confirmation Workflow

## Purpose

Build 018 adds the server-enforced confirmation boundary required before Level 2 tools can change
Hub state.

The workflow displays the exact intended action, records an explicit approve/reject decision,
expires stale approvals, and prevents a successful approval from being replayed.

## Scope

Build 018 adds:

- persistent confirmation requests
- server-generated exact action previews
- JSON Schema validation of untrusted tool arguments
- canonical argument fingerprints
- Owner/Administrator approve and reject decisions
- configurable confirmation expiry
- lazy expiration of stale pending/approved requests
- exact tool-key and argument matching at consumption
- requester/approver identity binding
- atomic single-use consumption
- confirmation audit evidence
- confirmation queue UI
- confirmed knowledge-document deletion as the first real Level 2 consumer
- reversible migration 0009

## Non-scope

Build 018 intentionally does not add:

- generic execution of arbitrary registered tools
- Home Assistant actions
- MQTT actions
- business connector writes
- secret storage
- the full audit-log browsing/filtering UI
- background confirmation notifications
- remote/mobile approval

Those remain assigned to later roadmap builds.

## Confirmation lifecycle

A confirmation request can move through:

```text
pending
  -> approved -> consumed
  -> rejected
  -> expired

approved
  -> expired
```

`consumed`, `rejected`, and `expired` requests cannot be reused.

## Exact action preview

The server, not the browser or model, builds the preview from:

- stable registered tool key
- registered tool name and description
- registered risk level
- schema-validated arguments
- canonical arguments JSON

The UI shows the server-generated summary and the exact structured arguments before approval.

## Argument validation and fingerprint

Arguments are untrusted input.

Before a confirmation is created:

1. the registered Build 017 input schema is validated as a Draft 2020-12 JSON Schema
2. arguments are validated against that schema
3. undeclared top-level properties remain rejected by the normalized tool contract
4. arguments are round-tripped through canonical JSON
5. the canonical representation is SHA-256 hashed

Consumption requires the same:

- confirmation ID
- tool key
- canonical argument hash
- normalized argument object

A changed document ID or any other changed argument invalidates the approval.

## Approval permissions

### Request
Owner, Administrator, and Household User accounts may create a Level 2 confirmation request for an
enabled tool.

Read-only accounts cannot create requests because Build 016 blocks state-changing requests.

### Decision
Only Owner and Administrator accounts can approve or reject Level 2 requests.

### Consumption
A confirmed action can be consumed only by the original requester or the Owner/Administrator that
approved it. Individual execution endpoints may impose stricter role requirements.

The first Level 2 consumer, knowledge-document deletion, requires Owner/Administrator execution.

## Expiry

`CONFIRMATION_TTL_SECONDS` defaults to **300 seconds (5 minutes)**.

Supported configuration range:
- minimum: 30 seconds
- maximum: 3600 seconds

Pending and approved requests become `expired` when accessed after their deadline.

Expired requests return HTTP 410 when a decision or consumption is attempted.

## Replay prevention

An approved request is consumed with an atomic database update that succeeds only while its status
is still `approved`.

The approval state transition and the protected database action are committed in the **same
transaction**.

This means:

- successful actions cannot reuse the same confirmation
- a second consumer loses the atomic status race
- changed arguments cannot reuse the confirmation
- changed tool keys cannot reuse the confirmation
- a failed action transaction rolls back the consume transition with the action

No reusable approval token or secret is exposed to the browser.

## Knowledge deletion safety closure

Before Build 018, the Build 015 knowledge-document delete endpoint used a browser confirmation but
did not have a server-side Level 2 approval boundary.

Build 018 closes that gap.

`DELETE /api/v1/knowledge/documents/{document_id}` now:

- requires Owner/Administrator authorization
- returns HTTP 428 without `confirmation_id`
- requires an approved `knowledge.document.delete` confirmation
- requires the confirmed `document_id` to match exactly
- consumes the approval in the same transaction as database deletion
- cannot replay the same approval after a successful delete

The Knowledge UI creates the confirmation, displays the exact server preview, records Approve or
Reject, and only then submits the destructive operation.

## API

### Create and inspect

- `POST /api/v1/confirmations`
- `GET /api/v1/confirmations?status=...`
- `GET /api/v1/confirmations/{request_id}`

### Decisions

- `POST /api/v1/confirmations/{request_id}/approve`
- `POST /api/v1/confirmations/{request_id}/reject`

Status filters:
- pending
- approved
- rejected
- expired
- consumed
- all

## User interface

Owners and Administrators receive a **Confirmations** navigation entry.

The screen shows:

- status
- tool name/key
- exact intended action summary
- exact arguments
- Level 2 risk
- requester identity
- argument fingerprint
- expiry
- Approve/Reject controls for pending requests

## Database migration

Alembic revision `0009_confirmation_workflow.py` creates
`confirmation_requests` with:

- UUID request ID
- requester user
- deciding user
- tool reference/key
- risk snapshot
- exact arguments JSON
- SHA-256 argument fingerprint
- exact preview JSON
- lifecycle status
- expiry
- decision timestamp
- consumption timestamp
- created/updated timestamps

The migration is reversible to revision 0008.

## Audit evidence

Build 018 records:

- `confirmation.requested`
- `confirmation.approved`
- `confirmation.rejected`
- `confirmation.expired`
- `confirmation.consumed`

Audit arguments contain the tool key and argument fingerprint rather than a reusable approval
secret.

Build 019 expands the audit-log browsing and filtering experience.

## Security impact

Build 018 strengthens the Hub by moving Level 2 safety from client convention to server policy.

Important properties:

- browser confirmation alone cannot authorize an action
- model-generated arguments are schema-validated
- previews are server-generated
- approval is bound to exact canonical arguments
- decisions are role-restricted
- approval expires
- approval is single-use
- Level 3 tools cannot enter the workflow
- Level 0 tools cannot be unnecessarily routed through the Level 2 workflow
- disabled tools cannot create confirmation requests
- no approval token or confirmation secret is stored client-side
- no external confirmation service is introduced

## Tests

Build 018 covers:

- exact preview contents
- JSON Schema validation
- rejection of extra/invalid arguments
- rejection of non-Level-2 tools
- approval
- rejection
- repeat-decision prevention
- expiry and HTTP 410 semantics
- Household request / admin-decision boundary
- exact action mismatch rejection
- atomic single-use consumption
- replay rejection
- audit evidence
- direct destructive delete blocked without confirmation
- confirmed knowledge delete and source cleanup
- migration upgrade/downgrade
- model persistence
- confirmation queue UI and approval interaction
- Windows/Tauri packaging

## Rollback

1. Roll application code back to Build 017.
2. Downgrade Alembic revision 0009 to 0008.

The downgrade removes confirmation workflow records only. It does not remove users, sessions,
tools, integrations, knowledge documents, conversations, or model profiles.

Rolling code back to Build 017 would also restore the older knowledge-delete behavior, so a rollback
should be treated as a security regression and used only for controlled recovery.

## External setup

No external application, API key, OAuth registration, hosted database, secret, or paid service is
required.

## Next build

**Build 019 — Audit Log**

Build 019 will expose actor, tool/action, sanitized arguments, result, timestamps, and operational
filters over the audit evidence already being produced.
