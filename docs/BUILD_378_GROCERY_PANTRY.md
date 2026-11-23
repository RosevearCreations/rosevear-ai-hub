# Build 378 — Grocery Ordering Board and Pantry

**Source-delivered household feature; original Windows runtime acceptance FIELD_HOLD.** This is a private household planning, pickup and pantry notebook, not an ordering integration, POS, inventory sensor, or a way for AI to spend money.

## Delivered

- A new **Groceries** screen in the Hub navigation and Ctrl+K workspace finder for authenticated household roles on desktop, tablet, and mobile.
- Local, durable items with names, units (each, pack, kg, g, L, mL), two-decimal requested/on-hand/reorder quantities, manual price notes and private notes, optional pantry expiry/pickup dates and recurrence every 1–365 days.
- Low-stock, expiring-in-seven-days and recurring-due indicators. These are computed from **user-entered** information, not live sensor data or vendor feeds. No background ordering, notifications, or scheduling.
- Family roles: owner, administrator and household_user can create/revise items; read_only is view-only. Owner/administrator alone approve exact draft quantities for **manual pickup**, archive or merge. Edits invalidate approvals.
- Expected-revision checks prevent stale writes and duplicate pickup. Partial receipts update the pantry by the confirmed amount and leave the rest as a draft requiring reapproval.
- Manual normalized same-name/same-unit merging adds bounded quantities, preserves the earliest known expiry, archives the source without deleting history and invalidates approvals.
- Print button only prints owner-approved pickup lines, with local browser print preview. No merchant login, ordering, payment or external messaging endpoint.
- Append-only activity history, local audit, authenticated no-store API, SQL migration 0039, responsive UI and security/regression tests.

## Original Windows Hub acceptance (not completed by GitHub CI)

1. Verify a restorable, off-machine SQLite backup; stop the backend and apply additive migration 0039 using the supervised updater, then restart the Hub API. A web client reload normally suffices.
2. Create a clearly labelled test item, test owner, household_user and read_only permissions, and confirm only owner/administrator can approve the exact draft quantity.
3. Record a partial pickup (e.g. 1.5 of 2.5). Verify pantry increases only 1.5, remaining requested quantity is draft, and stale revision/replay is rejected.
4. Merge exact duplicate same-unit test items, inspect local audit/history and expiry/recurring warnings, and print the approved-only list from the original owner browser.
5. Confirm zero retail/payment calls, external messages, new Windows tasks, sensor reads, or financial writes to other Rosevear apps. Test accessibility and all themes.

## Rollback and authority

Migration 0039 is additive. Keep the table when rolling back code unless restoring a verified compatible database backup. Do not downgrade blindly: it deletes new grocery items and activity history. GitHub CI GREEN does not prove original Windows installation or real household acceptance.

## Next

**Build 379 — Family Calendar, Chores and Reminders.** Nine numbered proposals 379–387 remain, plus displaced MQTT/radio-bridge scope. This grocery board does not itself enable automatic calendar reminders.

## References

- https://fastapi.tiangolo.com/tutorial/dependencies/
- https://docs.sqlalchemy.org/en/20/orm/declarative_tables.html
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
