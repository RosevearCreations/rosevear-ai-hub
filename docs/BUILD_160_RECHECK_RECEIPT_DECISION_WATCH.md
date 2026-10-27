# Build 160 — Independent Recheck Receipt Comparison & Exception Decision Watch

Status: IMPLEMENTED; reviewed `dev` → `main` promotion and source CI verification pending.

## Scope

1. Compare an earlier private Build 159 JSON export with the newer complete local Build 159 export. Validate both entire nested chains first; require chronological export times, exact ordered prefix of observations, source readings, handoffs, reviewer notes, outcome rounds and recurrence rechecks, unchanged coarse installed-version/access category and at least one new recheck. Neither file is cryptographically authenticated, imported or merged by comparison.
2. Compare two successive private Build 159 recheck notes on one exact original follow-up, with a newer latest outcome index and later timestamp. Preserve reason and recurrence evidence changes, lingering source identity exceptions, manual age from first recheck, and unconditional historical HOLD.
3. An owner/admin may append a bounded fixed-category private exception watch only after explicit Windows personal witnessing and separate HOLD acknowledgement. The latest recheck must not be imported. New note anchors exact indices, original first timestamp, as-of signals, and `PRIVATE_EXCEPTION_WATCH_NOT_SENT` / `NOT_AUTHORIZED` states. Reject duplicate exact pair/reason notes, forged fields, reordered/changed snapshots and unsupported categories.
4. Nested Build 160 private JSON retains Builds 148–159 and all unresolved source/owner discrepancies (maximum 100 watch notes; 2.1 MB). Older receipts import as unverified historical context only. No background jobs, timers, network dispatch, assignment, closure, credentials or device action.

## Acceptance and restrictions

- Full web tests, TypeScript, production bundle and all five GitHub jobs must pass at each feature PR, independent `dev` push, `dev`→`main` PR and independent production `main` push.
- Source CI GREEN never certifies the installed household Windows Hub, Home Assistant VM, MQTT, Ollama, cameras, independent field reviewer or first-party password/document Vault (still **0/6 verified · SECURITY HOLD**).
