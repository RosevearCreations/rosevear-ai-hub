# Build 036 — Connector Framework

## Goal

Create one stable, read-first business connector boundary before any Devil n Dove, Rosie Dazzlers,
or Yard Workers data is fetched.

## Scope

- common connector descriptor, capability, status, read-result, and safe-error types
- deterministic connector registry with duplicate-key protection
- fail-closed base write path
- Devil n Dove planned read registration for Build 037
- Rosie Dazzlers planned read registration for Build 038
- Yard Workers planned read registration for Build 039
- authenticated list/detail API under `/api/v1/business`
- Business UI and contextual help
- backend/web tests and Build 036 versioning

## Non-scope

- no live business-system HTTP request
- no credential, secret, OAuth, cookie, or API-key setup
- no synchronization job or background polling
- no database persistence or migration
- no AI-executable business tool
- no generic business write
- no change to the three source applications

## Security impact

The framework treats every future business system as an external trust boundary. Reads are the
default access mode. The base write operation always fails closed, and descriptor metadata records
that future writes require confirmation. Browser-facing metadata contains normalized state only.

Provider-specific authentication, URL/SSRF restrictions, request timeouts, pagination limits,
redaction rules, and minimum-data contracts must be implemented by each concrete read connector.

## Migration

None.

## Rollback

Code-only rollback to the previous verified main SHA. No database downgrade is required.

## Operator setup

None. Do not create credentials for Build 036.

## Next build

Build 037 — Devil n Dove Read Connector.
