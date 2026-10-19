# Build 090 — Context Review Summary & Independent Verification Boundary

## Scope
Summarize the existing manual status and follow-up review counts in the chosen Home, Workshop or Business context. Counts derive solely from the current sanitized snapshot and transient review acknowledgement. Review never means verified, resolved, safe or repaired.

## Operator acceptance
1. Open Operations overview; confirm counts reflect the selected context.
2. Mark a follow-up reviewed and confirm outstanding/reviewed totals change without hiding verification requirements.
3. Switch context; confirm only the selected context's counts appear.
4. Refresh manually; review flags reset and displayed counts reflect the new snapshot.
5. Confirm no raw provider details, device addresses, customer details or credentials appear.

## Security, tests and rollback
Frontend-only. No API changes, persistence, external exports, service/device actions, scheduled tasks, migrations, paid dependencies or server reboot. Regression tests cover review transitions, refresh, context isolation and privacy. Revert frontend/tests/docs in Git if required. Require 5/5 CI on dev PR and independent dev push, then isolated production PR and independent main push. Live Windows PWA acceptance and reboot validation are separate owner tasks.

## Next queued
Build 091 — scope to be confirmed by operator priorities.
