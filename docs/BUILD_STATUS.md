# Build Status

This file records completed and active builds. The roadmap remains authoritative for planned scope.

| Build | Name | Status | Promotion |
|---|---|---|---|
| 001 | Repository and Documentation Foundation | COMPLETE | main via PR #1 |
| 002 | FastAPI Backend Skeleton | COMPLETE | main via PR #2 |
| 003 | Local Database Foundation | COMPLETE | main via PR #3 |

## Build 001 evidence

- Canonical source-of-truth documentation committed.
- Foundation workflow completed successfully.
- PR #1 merged to main.
- `dev` synchronized with `main` after promotion.
- Production commit after promotion: `d03032d23f78de1c3387004bdf1e02d9d8320d21`.

## Build 002 evidence

- Python project packaging established.
- FastAPI application factory delivered.
- `/health` and `/version` delivered.
- Environment configuration and structured JSON logging delivered.
- Pytest + Ruff checks passed.
- PR #2 merged to main.
- Production commit after promotion: `067cd8e48ea0fabeb50ed6a0061c80bc367f7d2d`.

## Build 003 acceptance

- [x] SQLAlchemy database foundation
- [x] SQLite foreign-key enforcement
- [x] Alembic migration framework
- [x] initial reversible schema migration
- [x] users table
- [x] application settings table
- [x] audit events table
- [x] conversation metadata table
- [x] migration tests
- [x] ORM persistence tests
- [x] latest dev CI passed before PR close
- [x] PR #3 created for promotion to `main`

## Build 003 notes

- Authentication behavior remains intentionally deferred to Build 016.
- Alembic migrations, not application startup, are authoritative for schema changes.
- No external service or additional application is required for this build.
