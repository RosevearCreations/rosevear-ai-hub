# Windows Test Server Update

This procedure updates the test PC only after a release has already reached a verified GREEN main.
It is not a production deployment mechanism and it must not be run against an unverified candidate
SHA.

## Prerequisites

The test PC needs:
- the existing rosevear-ai-hub Git checkout
- Git in PATH
- Python 3.11 using py -3.11 or python
- Node.js and npm
- the machine's existing local integration settings and secrets
- network access to GitHub for git fetch

The updater does not change .env, stored secrets, Home Assistant tokens, MQTT credentials, or Ollama
models.

## Safe update command

From PowerShell in the repository root run:

    powershell -ExecutionPolicy Bypass -File .\scripts\update-test-server.ps1 -ExpectedCommit <VERIFIED_MAIN_SHA>

Replace <VERIFIED_MAIN_SHA> only with the exact Build 030 closeout SHA reported after final
Production CI is GREEN.

The script:
1. refuses to continue when tracked local changes exist
2. fetches origin/main
3. verifies origin/main equals the supplied release SHA
4. switches to main and performs a fast-forward-only pull
5. creates .venv when missing
6. updates Python dependencies
7. updates Node workspaces
8. runs alembic upgrade head
9. runs backend tests
10. runs web type checking and tests
11. builds the production web application
12. reports the exact installed SHA

Use -SkipVerification only when a full test run was deliberately ruled out. The normal test-PC
update should not use it.

## Restart and verify

After the updater succeeds, restart the Hub using the same local launch method already used on the
test PC. For the development desktop stack, scripts\dev-desktop.ps1 remains available.

Verify:
- GET /health returns status ok
- GET /version reports 0.0.30
- login succeeds
- the Notifications navigation item appears
- the circled i help control appears in each primary section
- Notifications -> Send local test creates an unread local notification
- an automation using notification.household.send creates a durable inbox record

## Build 030 migration

Build 030 adds Alembic revision 0014:
- notifications
- notification_receipts

The update script applies the migration. Do not copy or replace the SQLite database manually.

## Rollback

Before rollback, stop the Hub. Downgrade with:

    .\.venv\Scripts\python.exe -m alembic downgrade 0013

Then check out the prior verified release. Downgrading removes notification inbox and read-state data
introduced by Build 030.
