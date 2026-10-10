# Build 040 — Narrow Confirmed Business Writes

## Status

Feature implementation active on `build-040-narrow-confirmed-business-writes`.

## Goal

Add only narrowly scoped business mutations that can be reviewed as exact Level-2 actions before
execution. Read connectors remain the default and every unlisted write stays fail-closed.

## Approved writes

Build 040 was reviewed against these source-system commits:

- Devil n Dove: `e0899743b6e7e9d87b1017479a7f90c5e95018a2`
- Rosie Dazzlers: `c3a20007bbbb40ff8c8a5fc8160705f30419591c`
- Yard Workers: `8514825087326bdfe8b5de0e0c96d937ac7c10ee`

Only two operations qualify.

### Devil n Dove — review-only product story draft

Tool: `business.devilndove.story_draft.create`

Upstream contract: `POST /api/admin/product-story-notes` with `action=save`.

The Hub accepts only product ID, heading, summary, and body. It always forces:

- `display_status=draft`
- `privacy_status=needs_review`
- `story_source=rosevear_ai_hub`
- no public approval or publish operation

### Yard Workers — private internal job update

Tool: `business.yardworkers.job_comment.create`

Upstream contract: `POST /functions/v1/jobs-manage` with `entity=job_comment` and
`action=create`.

The Hub accepts only job ID and comment text. It always forces:

- `comment_type=update`
- `visible_to_client=false`
- `is_special_instruction=false`
- `set_job_instruction=false`

The upstream Yard Workers identity must also have Jobs create permission and Supervisor+ authority.

## Rosie Dazzlers decision

Rosie Dazzlers stays read-only. Its current mutation contracts are broad record-save/upsert surfaces
rather than a narrow single-purpose operation. Build 040 does not weaken the write boundary merely
to make every connector symmetrical.

## Confirmation and replay safety

Both tools are Level 2 — Confirmation required.

The UI intentionally separates:

1. Prepare exact confirmation
2. Review and approve exact arguments
3. Execute confirmed write

The confirmation is consumed and committed before the outbound provider request. External providers
cannot join the Hub database transaction, so this ordering prevents automatic replay after a timeout
or ambiguous outcome. A failed or uncertain provider request remains consumed. Operators must inspect
the source system before preparing a new confirmation.

No background retry, polling, synchronization, or queued mutation is added.

## Security boundary

- Owner/Admin execution only
- exact tool key + exact canonical argument hash must match the approval
- single-use confirmation
- no generic URL, method, body, entity, or action proxy
- existing backend-only business credentials reused
- remote HTTPS rules from Builds 037–039 remain in force
- provider errors are sanitized
- successful, blocked, failed, and uncertain attempts create Hub audit evidence
- every write not listed above remains hard-blocked

## Database and dependency impact

- no Hub migration
- no source-system migration
- no Devil n Dove, Rosie Dazzlers, or Yard Workers source change
- no new package dependency
- no paid service added

## Version

Build 040 release version: `0.0.40`.

## Promotion evidence

To be completed after feature dev CI, protected-main promotion, Production validation,
release-evidence closeout, and final dev synchronization are GREEN.
