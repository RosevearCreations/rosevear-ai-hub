# Build 154 — Independent Follow-Up Decision Replay & Evidence Recurrence Oversight

## Scope

The authenticated Owner/Admin System workbench replays manual Build 153 follow-up notes against their exact Build 152 repeat-trial link, source pseudonym, original event timestamps and independent reviewer criteria. All data stays in the current browser session unless deliberately exported as private JSON. No new backend route, periodic monitor, alarm, Windows task, Home Assistant/MQTT call or camera action is introduced.

An exact `(link_index, criterion)` topic displays the first and latest owner note, original immutable link time, historical versus currently derived reviewer status, number of notes and separate reviewer decisions. The recurrence register classifies multiple notes on one topic, repeated independent decisions, contradictory reviewer evidence, pseudonymous source mismatches, superseded owner trials, changed/unwitnessed Windows version, imported history and current-versus-historical evidence status change. These categories retain underlying reports even when later operator claims look improved. A safe alias cannot independently prove physical device identity.

Review can be filtered to recurring topics, source/Windows issues, reviewer changes or imported historical evidence. Each row links only to pre-existing manual case preparation and allowlisted module navigation. Filter changes never mutate source evidence, schedule follow-ups, send communications, clear a security hold or dispatch work.

## Independent reviewer handoff

1. Record a Build 153 owner note against an exact outstanding criterion or physical HOLD.
2. Inspect its Build 154 replay and original source timestamps, previous owner notes, current claimed status and recurrence classifications.
3. Select the exact latest note. Historical imported notes and already-reviewed exact notes cannot receive a new current decision. Recheck the real installed Windows version before continuing.
4. A separate reviewer personally inspects the evidence, checks the explicit witness statements and selects a bounded decision category (repeat manual trial, private source verification, reviewer contradiction reconciliation, fresh owner note or independent HOLD recheck).
5. The app records an unverified private **`INDEPENDENT_FOLLOWUP_REVIEW_HOLD`** event. It is *not* a signed independent approval, repair order or release authority. Later decisions require a separate newly recorded owner note; history is append-only.

## Private schema and tests

Build 154 wraps the complete validated Build 153 receipt, which itself contains all Builds 148–152 evidence. It adds a bounded list of separately witnessed decision events, with exact case/criterion/link index, owner-note index, original link and follow-up timestamps, current status snapshot, fixed decision code, reviewer time and immutable HOLD fields. Import validates all nested data first, rejects extra/private fields, forged approvals, duplicate note decisions, cross-case pointers and incorrect chronology, and never partially replaces a local session after failure. The receipt is limited to 900 KB and 240 reviewer decisions. Legacy Builds 148–153 still import as historical claims with no fabricated decisions.

Acceptance requires both focused model/UI tests and the full web typecheck, unit suite, production build and GitHub reviewed `dev` → `main` promotion with a successful independent `main` push workflow.

## Readiness boundary

Source CI green is not the household's physical field acceptance. Imported records, safe source aliases, installed Windows labels and separately checked reviewer attestations are unverified private claims. The fixed `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED` closure and `DISABLED` dispatch apply to all statuses. The first-party password/document Vault remains **0/6 verified · SECURITY HOLD**. No service, device, router, camera, MQTT, authentication or Vault configuration is changed by this build.

Next proposed: **Build 155 — Independent Recurrence Resolution Evidence Intake & Overdue Decision Watch**.
