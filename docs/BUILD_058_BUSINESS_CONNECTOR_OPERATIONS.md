# Build 058 — Business Connector Operations Workspace

## Scope
Unified operator status for Devil n Dove, Rosie Dazzlers and Yard Workers, implemented using
the existing authenticated connector catalogue and bounded per-resource reads. Local
configuration readiness is distinct from successful remote verification.

- Manual **Refresh connector readiness** reloads the server-side, credential-free connector descriptors.
  This is a configuration check; it does not contact external providers.
- Each existing manually requested, bounded resource read records in-memory evidence:
  connector, resource, result (success/failure), local observation time, page count and
  additional-page indicator. No data is read automatically.
- The operator sees "not read" or "failed" rather than a false "online" badge. There is
  no claim of source-record age or historical uptime.
- Existing exact-confirmation, one-shot Devil n Dove review-only story draft and
  Yard Workers private job comment remain the only permitted external mutations.
  Rosie Dazzlers remains read-only. None of the writes auto-run or auto-retry.
- Browser-based ledger intentionally holds no raw records, private customer details,
  error contents, secrets, usernames, remote URLs or approval payloads.
  Existing bounded data preview remains explicitly user-initiated and session-scoped.

## Non-scope and security impact
No new cloud provider, paid dependency, credential transfer, background polling,
automated publication, workflow trigger, database migration, API route, or device control.
All existing owner/administrator roles and server-side confirmation consumption remain
unchanged. HTTPS/private access, encryption and household acceptance are separate checks.

## Acceptance
- Readiness shows three businesses and differentiates configured from live-verified.
- Each manual read updates only its connector/resource evidence. Failures do not appear verified.
- Manual refresh works without loading or leaking source records.
- Existing bounded previews and confirmed external-write workflows continue unchanged.
- Web tests, typecheck and build, backend lint/tests, Windows backup/desktop CI green on
  dev, PR and main push. Manual private Windows UI and source-system read checks still required.

## Operator steps
1. Update/restart the Hub locally using the established Windows scripts; verify `/version`.
2. Sign in and open **Business**. Use **Refresh connector readiness**.
3. For each configured connector, select an individual **Read** action.
   Check the record count and observation timestamp, or the failure state.
4. Verify the same resource in its source business application if currency matters.
   A successful read does **not** establish that upstream records are fresh.
5. Confirm no read can proceed without credentials, no Rosie write is available and
   all other writes demand exact confirmation and separate execution.

## Rollback
Revert the Build 058 web-only changes and rebuild/restart the client.
No schema/data change or upstream action is performed by this build's workspace.
Any separately approved external write is not undone by rolling back the Hub.

**Next queued:** Build 059 — Conversation, Voice and Knowledge UX.
