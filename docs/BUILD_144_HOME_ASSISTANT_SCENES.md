# Build 144 — Home Assistant Scenes & Safe Action Drafts

## Delivered source behavior

The Home Assistant page now includes a dedicated owner/administrator draft workbench. It lists only **currently observed** `light.*` and `switch.*` entities on the existing reviewed control allowlist, excluding known safety-sensitive labels and domains. Operators may assemble one to four **distinct** steps, see room and target labels, then request a source-state preview. A preview is informational: it sends no device action.

The backend re-reads Home Assistant, checks exact IDs, state, risk class, allowlist and enabled low-risk tool registry before issuing a cryptographically random, single-use preview ticket. The user must inspect the exact target and requested outcome and type the displayed `RUN …` phrase. Tickets expire after 120 seconds, are tied to the authenticated operator and exact ordered steps, and are consumed even on a wrong or stale execution attempt.

Before taking any action, execution rechecks **all** exact entities, their observed states, the risk holds and current allowlist. If any source has changed or become unreachable, execution fails without sending a command. Accepted steps use the pre-existing single-entity Home Assistant control boundary and its audit logging, one at a time. Each step is then independently observed from the HA source:

- `executed`: Home Assistant reports the requested state after the call (this **does not certify physical motion**).
- `unverified`: provider accepted the call but the requested state could not be independently observed.
- `rejected`: provider or policy explicitly rejected that step.
- `skipped`: a preceding step was rejected or not verified.

Both the preview and per-action receipts are recorded in the existing authenticated audit ledger; follow-up steps stop after any failure or uncertainty. Results distinguish `executed`, `partial`, `unverified`, and `rejected` without conflating acceptance with success. No rollback is silently attempted after a partial scene, since additional physical operations would require new informed approval.

## Explicit holds

- **No hidden or opaque native Home Assistant scene activation.** A native `scene.*` may affect unknown targets and remains outside this multi-step workbench.
- **No autonomous, chatbot-triggered, scheduled or background multi-device execution.** There is no registered AI scene tool or cron entry.
- **No sensitive actions.** Locks, gates, alarms, climate/heat, security and known workshop/industrial equipment are held. The existing safe-control allowlist and low-risk tool registry are final authorities, and the Build 144 backend performs stricter checks.
- **No distributed-ticket promise.** Pending tickets are in-memory and process-local. Restarting or routing execute to a different worker fails closed; a fresh preview is required. The workbench uses no persistent command queue.
- **No physical field acceptance claim.** CI uses simulated Home Assistant states and provider failures; it does not drive or inspect the Rosevear Windows server or real household devices.

## Verification

Backend `server/tests/test_home_assistant_scene_drafts.py` exercises preview-only calls, exact confirmation and replay prevention, high-risk/native-scene rejection, unknown or duplicated entities, source drift, expiry, allowlist revocation, partial failure, unverified acceptance, skip receipts and role denial. Frontend `apps/web/src/sceneDraftModel.test.ts` and `apps/web/src/SceneDraftWorkbench.test.tsx` exercise conservative eligibility, explicit user control, preview invalidation, confirmation and truthful outcome rendering.

## Independent on-premise field checks (not executed by source CI)

1. On the Windows test installation, back up the Hub and verify actual Home Assistant entities and control policy while physically present.
2. Choose a reviewed nonhazardous test lamp; confirm the read-only draft preview leaves it unchanged and shows the exact current source state.
3. Inspect the audit record for preview, then either stop without acting or deliberately confirm one test action. Verify the physical lamp, reported HA state and single-action audit separately.
4. Confirm source disconnection, changed state, revoked allowlist and unsupported machinery are held; do not simulate high-risk equipment actions on real hardware.
5. Record observed Windows build/version, operator, date, provider state and manual result before designating this build as **field-accepted**.

**Next expected Build 145:** Workshop Equipment 360 & Preventive Maintenance Planner.
