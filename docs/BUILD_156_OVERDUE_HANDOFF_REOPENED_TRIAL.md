# Build 156 — Independent Overdue Decision Handoff Evidence & Reopened Trial Comparison

## Delivered in the authenticated System owner workbench

Build 156 adds an on-demand decision watch and local-only private handoff ledger beneath Build 155. It freezes the exact Build 154 decision index, criterion, source follow-up/link, original timestamps and day/age band **at the manual handoff moment**. The same record captures any exact Build 155 resolution index, its owner improvement/recurrence claim and trial, the newest eligible owner-witnessed trial and safe alias check **as of that timestamp**. It never edits the older record.

- An overdue review is advisory after 72 hours (3 days) and is computed only while viewing the screen; it does not create a timer, notification or automatic escalation.
- A later issue/blocked observation after a Build 155 resolution is `REOPENED_ISSUE_AFTER_RESOLUTION`; a later pass remains `REOPENED_PASS_AFTER_RESOLUTION_UNVERIFIED`. An observed pass never clears the original finding.
- An owner-safe changed pseudonymous alias is `ALIAS_CHANGED_RECHECK_HOLD`, a contradictory source check is `SOURCE_CHECK_DISPUTED_HOLD`, and a matching alias is **still unverified**. No real device identifiers, connection strings or credentials are requested or exported.
- The owner selects one of three fixed HOLD-only handoff reasons (overdue review, reopened owner trial or source alias recheck), which must match the observed evidence. Two explicit witness/HOLD checks and personally witnessed matching installed Windows context are needed to prepare a local private packet. **No packet is sent.**
- Imported decision, link, source follow-up, resolution, latest owner trial and latest source check evidence remains historical and cannot become newly witnessed approval. A superseding independent decision prevents preparing a stale handoff.

## Append-only private receipt

`rosevear_independent_overdue_handoff` schema version 1 nests a fully validated Build 155 receipt and the complete Builds 148–154 source chain. Each append-only handoff stores the exact event-time snapshot, fixed reviewed reason and permanent `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED` and `PREPARED_PRIVATE_HANDOFF_NOT_SENT` flags. `automatic_dispatch` and `automatic_escalation` are both `DISABLED`. A record cannot be silently edited, upgraded to an approval, moved to a different trial/decision/source or duplicated for the same reason/evidence/age band.

Imports validate known fields, bounded timestamps, source indices, source alias classifications, age-band calculations, chronological order, max 160 handoffs, a 1.2 MB outer limit and a 1.05 MB nested Build 155 limit. Imports of Builds 148–155 create **zero** Build 156 events, reset installed-Windows witnessing and remain historical. All data lives in this browser session until the owner intentionally downloads a JSON file; no server persistence is added.

## Verification and remaining holds

The model and panel tests cover 24-hour/3-day/7-day age states, later reopened outcomes, changed aliases, immutable earlier snapshots, imported history, reason/witness gates, duplicates, forged closure, unknown private fields, tampered nested receipt and no background fetch. The complete web unit suite, TypeScript and production build plus independent GitHub `dev` and `main` promotion workflows must pass before source Production GREEN.

Source GREEN does **not** certify operation of the household Windows server, Home Assistant VM, MQTT, Frigate/go2rtc, Ollama, cameras, accessibility, independent reviewer identity or private network. Physical field acceptance and independent review remain HOLD, and the first-party password/document Vault remains **0/6 verified · SECURITY HOLD**. No new paid infrastructure, device command, scheduled escalation or automated Windows task was introduced.

Next proposed: **Build 157 — Independent Handoff Receipt Reconciliation & Recurrence Follow-Up Aging**.
