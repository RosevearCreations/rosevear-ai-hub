# Build Status

This file records completed and active builds. The roadmap remains authoritative for planned scope.

| Build | Name | Status | Promotion |
|---|---|---|---|
| 001 | Repository and Documentation Foundation | COMPLETE | main via PR #1 |
| 002 | FastAPI Backend Skeleton | COMPLETE | main via PR #2 |
| 003 | Local Database Foundation | IN PROGRESS | dev |

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

## Build 003 acceptance checklist

- [x] SQLAlchemy database foundation
- [x] SQLite foreign-key enforcement
- [x] Alembic migration framework
- [x] initial schema migration
- [x] users table
- [x] application settings table
- [x] audit events table
- [x] conversation metadata table
- [x] migration tests
- [x] ORM persistence tests
- [ ] CI passes on Build 003 PR
- [ ] promoted to `main`
- [ ] `dev` synchronized with promoted `main`
