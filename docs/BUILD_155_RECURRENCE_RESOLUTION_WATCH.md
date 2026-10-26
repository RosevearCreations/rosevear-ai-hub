# Build 155 — Independent Recurrence Resolution Evidence Intake & Overdue Decision Watch

## What was delivered

The existing authenticated Owner/Admin System workbench now has a **manual, read-only decision watch** beneath Build 154. Every row retains an exact decision index, original Build 152 link time, Build 153 note provenance, independent Build 154 decision time, latest owner trial index/time, bounded source-alias comparison and optional Build 155 evidence intake. It never fabricates an independent resolution or sends work to a device.

Decision age is computed **only when the panel renders**, from the original Build 154 reviewer note time rather than the export/import time. Bands are under 24 hours, 1–3 days, overdue 3–7 days and overdue beyond 7 days. Overdue is advice for a human review, not a scheduled timer, notification, owner assignment, escalation or closure. Filtering keeps all original notes and contradictory history intact.

## Safe manual recurrence evidence

1. Record a Build 154 separate-reviewer HOLD decision on the exact latest Build 153 owner follow-up.
2. In the installed Windows Hub session, personally witness a **newer** owner trial in the same case using the existing Build 148 workbench. Physical installation, live device operation, private access and camera playback are separate from source-level CI.
3. Inspect the decision and newer trial in Build 155. A newer observed **issue/blocked** state is labelled `RECURRING_ISSUE_REPORTED`; a newer **passed** state is labelled `OWNER_IMPROVEMENT_UNVERIFIED`. Any safe source token match stays `ALIAS_MATCH_UNVERIFIED` and is not physical device authentication.
4. Select the exact decision and confirm two explicit witness/HOLD statements. The owner may record **one append-only, unverified HOLD event per independent decision**, pointing to the latest, non-imported, witnessed post-decision trial. Later trial changes require a fresh independent decision; an old intake is not overwritten.
5. Export the full private Build 155 JSON receipt to retain all prior Builds 148–154 and current Build 155 events. Refreshing or leaving this browser session does not silently upload data.

## Strict private receipt

The version-1 `rosevear_independent_recurrence_resolution_watch` envelope nests the fully validated Build 154 decision replay; its own bounded append-only list preserves exact decision, criterion, case, follow-up/link, trial, source check and chronological timestamps, observed result, two immutable HOLD fields, owner witness flag and fixed no-dispatch status. JSON import first validates the nested complete source chain, then checks cross-references, time order, source snapshot correspondence, allowed fields and fixed HOLD statuses. Rejections do not replace the existing session.

Maximum receipt size: 1.05 MB. Maximum Build 155 owner evidence records: 200. Older Builds 148–154 import as **historical unverified claims**, with zero invented Build 155 evidence and no fresh authorization. Imported decision/trial/evidence counts are separately tracked in this browser session. Decisions and trial identities cannot be guessed from IPs, serials, camera locations, MACs, passwords or other sensitive free text; the new panel contains no such field.

## Acceptance and limits

- Focused model and UI tests cover age thresholds, exact chronology, recurring issues, unverified improvements, source mismatches, newer trials after intake, imported history, invalid/forged JSON, double witness gates and zero background fetch.
- Full web typecheck, unit suite and production build plus reviewed GitHub `dev` → `main` Actions must be green before source promotion.
- Source deployment does **not** install software on the actual household Windows Hub or certify Home Assistant, MQTT, camera streaming, accessibility or private network readiness. Owner and independent physical acceptance stay on HOLD.
- `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED` closure and `DISABLED` dispatch/watch remain immutable. First-party password/document Vault remains **0/6 verified · SECURITY HOLD**. No new paid infrastructure or automatic Windows service task is introduced.

Next proposed: **Build 156 — Independent Overdue Decision Handoff Evidence & Reopened Trial Comparison**.
