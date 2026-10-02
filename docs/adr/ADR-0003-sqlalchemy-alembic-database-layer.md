# ADR-0003: SQLAlchemy and Alembic for the local database layer

**Status:** Accepted  
**Date:** 2026-10-02

## Context

The Hub needs a local SQLite database now and may later move selected deployments to PostgreSQL. Schema changes must be explicit, testable, reversible, and independent of application startup.

## Decision

Use:
- SQLAlchemy 2.x as the ORM/database abstraction
- Alembic as the schema migration system
- SQLite as the initial database
- explicit migrations rather than automatic `create_all()` during application startup

SQLite foreign-key enforcement is enabled for application-created connections.

## Consequences

Benefits:
- schema history is reviewable
- migrations are testable in CI
- SQLite works locally without another service
- PostgreSQL remains a practical future option
- application startup cannot silently mutate production schema

Costs:
- developers must run migrations
- migration files must be maintained carefully
- SQLite/PostgreSQL behavioral differences must be tested before any future migration
