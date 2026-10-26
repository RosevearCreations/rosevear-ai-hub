# Build 153 — Independent Reassessment Exception Aging & Owner Evidence Follow-Up

## Scope and readiness

Build 153 extends the authenticated Owner/Admin System field-trial workbench. It takes the exact original and retest indices, owner-safe alias references, source version, seven reviewer evidence classifications and private HOLD-only reassessment records from Builds 148–152. It introduces no API endpoints, scheduled jobs, hardware connection, third-party service, automation or remote storage.

The owner sees unresolved individual review criteria for every exact Build 152 repeat-trial link, plus a **mandatory physical field hold** even when every evidence criterion is claimed. Review statuses distinguish missing fresh evidence, explicit contradictions, imported reviewer history, source context holds, superseded repeat trials and a previously prepared packet that was subsequently reopened. A status or made-up source token never authenticates a real device.

The age band uses the original immutable `linked_at` timestamp: under 24 hours, 1–3 days, and at least three days. It is an advisory view calculated on opening/rendering the local workbench, not a background clock, task scheduler or escalation. The queue also separately shows the initial problem's `observed_at` and linked repeat trial's `observed_at` to prevent misleading "oldest issue" claims.

## Owner-only workflow

1. From System, review the existing Build 152 exact evidence link and source-level independent checklist.
2. Filter Build 153 exception rows by link age and proposed role. Use the existing manual module navigation and field-trial check; inspect the real Windows installation before considering any new observation.
3. Select one exact link and criterion. Read its original and new timestamps, current classification, reviewer comparison, owner and suggested fixed safe action.
4. After personally reviewing this evidence, tick the explicit witness checkbox and record the fixed role/action. This appends a private session-only `OPEN_MANUAL_HOLD` event; it **does not** dispatch the suggested task or grant closure.
5. Download the Build 153 private JSON receipt for offline custody. A later import restores all earlier nested receipt data plus bounded follow-up rows but reclassifies imported source/reviewer/owner claims as **historical and unverified**.

The private receipt is strictly validated: only enumerated fields and status/action/role values; at most 240 records; exact case, criterion, index and `linked_at` references; chronological timestamps; a 700 KB import bound; nested Build 152 receipt validation; immutable `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED`, `DISABLED` dispatch and `UNVERIFIED_PRIVATE_ATTESTATIONS`. All Builds 148–152 legacy private receipts still import as historical data without fabricating follow-up records. An invalid import preserves the current local state.

## Acceptance evidence

- One exact link yields explicit missing/gap review exceptions and a physical hold even with no reviewer data.
- Imported current-looking claims stay historical; contradictory evidence remains visible and cannot be cleared with a later `present_claimed` checkbox.
- A newer real owner trial supersedes the earlier retest, reopening manual review. A previously prepared private packet never becomes physical certification.
- Role and age filters do not change source evidence or automatically trigger notifications.
- Witness checkbox is required for appending a HOLD-only private note. The UI disables submit without selection, without witness and while inactive.
- New and legacy receipts round-trip or reject unknown/private fields, invalid pointer/time relations, fake GREEN, forged owner attestations or incomplete nested proof.
- Production deployment health is measured separately from real household Windows, Home Assistant, MQTT, camera, Ollama and Vault security acceptance.

## Explicit security and operational holds

No password/document Vault is exposed or enabled. Its independent assurance milestones remain **0/6 verified · SECURITY HOLD**. No Windows scheduled task, Home Assistant scene, camera/Frigate stream, MQTT publish, Ollama command, repair handoff dispatch or source-account write occurs. GitHub CI green proves source checks only. Physical `FIELD_ACCEPTANCE_HOLD`, independent `INDEPENDENT_REVIEW_HOLD` and `NOT_AUTHORIZED` closure remain unconditional until separately witnessed, independently reviewed and explicitly authorized outside this source-only feature.

Next proposed: **Build 154 — Independent Follow-Up Decision Replay & Evidence Recurrence Oversight**.
