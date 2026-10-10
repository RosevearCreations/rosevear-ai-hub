# Build 040 — Narrow Confirmed Business Writes

Status: **IMPLEMENTATION IN PROGRESS — NOT RELEASED**

## Safety-first implementation

This change introduces a code-owned, fail-closed authorization boundary and unit tests.
It does **not** enable write requests for Devil n Dove, Rosie Dazzlers, or Yard Workers.
A fully approved live write needs the following before an operation may be enabled:

1. Identify the single allowed resource and operation, and the authoritative upstream endpoint.
2. Confirm the upstream app's supported authentication, role checks and concurrency semantics.
3. Enforce strict server-side input schema and target identity validation.
4. Build an exact-action preview for an owner/administrator to approve.
5. Atomically consume a single-use, unexpired, payload-hash-matching confirmation.
6. Dispatch only the reviewed upstream method and path; never accept a caller-provided URL.
7. Enforce replay prevention / idempotency, bounded timeouts, sanitized errors and audit records.
8. Cover denied, expired, mismatched, replayed, rejected, upstream-error and successful cases.
9. Run backend and frontend checks on dev, merge through review, verify main CI and synchronize dev.
10. Only then release to the local test server through scripts/update-test-server.ps1 with the verified main SHA.

## Current state

All remote business connectors remain read-only. No new credentials or new external
services are required for this **non-production** authorization-boundary increment.
