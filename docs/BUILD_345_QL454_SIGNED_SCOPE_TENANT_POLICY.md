# Rosevear AI Hub Build 345 / QL-454 — Canonical signed principal and tenant-boundary policy

**Scope:** source-level six-tier deny-by-default authorization contract, reproducible signed synthetic tests, immutable owner-only registry and documented integration requirements. **Not** production federation, database RLS, user-account enrollment, original Windows hardware control, or proof of live CONNECTED.

## Implementation

- Pure evaluator: server/src/rosevear_ai_hub/cross_app_policy345.py. Every decision requires an exact app audience, explicit trusted server-side resource row descriptor, permitted action and security tier. No capability is inherited from another tier.
- Principal evidence: each protected request must carry an independently issuer-signed Ed25519 assertion with exact schema, app-specific audience, scope, subject, tenant/company, session ID, issued-at and expiry. Only public reads support an anonymous principal. Invalid assertions cannot fall back to public reads. All seven configured public keys must be distinct and pinned through protected server configuration, never provided from an HTTP caller.
- User T1: matching resource.ownerId and signed subjectId, exact role end_user, single named resource/action scope.
- Tenant T2: signed tenant_staff and exact resource.tenantId; strictly rejects wrong tenant, missing ID, operator role expansion, client-supplied extra resource metadata.
- Operator T3: signed company_operator and exact resource.companyId, company-specific named resource/action only. No fallback to tenant scope or automatic global administrator.
- Three-Master T4: issuer ai-data-platform, exact resource master_handoff:read, three separately signed Master policy-veto votes from ai-data-platform, rosevear-ai-hub and rosevear-comms-hub. Each vote is bound to assertion digest, resource digest and policy digest, <=30 seconds and OPEN_HOLD / connection HOLD with no activation or closure.
- Original-host T5: **always denied** by the cross-app evaluator, even with genuine T4 signatures. T5 requires distinct original protected Windows host/independent physical witnesses and owner-supervised ceremony. No API or message broker may grant T5.
- All decisions retain connection HOLD, cross-app NOT_VERIFIED, messageDelivered false, physical receiver OFF UNKNOWN, incident OPEN, activation/closure false. An authorization decision is NOT delivery, database row enforcement, key enrollment or device safety evidence.
- Protected source-policy registry GET: /api/v1/system/master-shell-345-policy; owner-authenticated only, no-store and GET only. The System UI shows source matrix, policy digest and unverified live gates without granting permissions.

## Canonical seven-application order and resources

1. ai-data-platform: top-tier Master, public status, user profile, tenant metrics, operator audit, Master handoff.
2. rosevear-ai-hub: local Master, local workspace, operator audit, Master handoff; original-host receiver T5 always DENY.
3. rosevear-comms-hub: Comms Master, scoped inbox and operator tasks.
4. iCamp: campground SaaS, camper profile, tenant reservation and operator ledger.
5. YW: Yard Workers shell, worker profile, tenant job, operator payroll.
6. devilndove: internal store, customer profile, tenant order, operator finance.
7. rosiedazzlers: detailing/booking, customer profile, tenant booking, operator finance.

Abstract resource kinds are **policy classes only**: receiving apps must independently bind them to real authenticated sessions, verified tenant membership and authoritative server-side database/storage records. This library does not replace PostgreSQL row-level security, private cloud storage rules or provider-boundary tests. The repo aliases YW = yw and devilndove = devilndove-site; the signed application identifiers are intentionally the established contract names from Build 344.

## Acceptance / evidence

1. All seven app public read resources permit anonymous read only, never write or protected data.
2. Valid issuer-signed T1/T2/T3 grants allow only exact own subject/tenant/company record and named action. Wrong role, owner, tenant, company, issuer, audience, scope, timestamp, signature, duplicated key or replayed session denies.
3. Seven-app T4 governance reads require **3 independent** signed in-scope Master votes; stale, absent, changed or CONNECTED votes deny. No T4 write.
4. Original-host T5 denies even with a full, valid three-Master quorum.
5. Owner-only endpoint denies anonymous access and all mutations; UI remains informational.
6. Full six-check feature/dev PR, independent six-check protected main PR and independent exact-production-main push six checks must pass before source code Production GREEN.
7. Cross-app rollout remains HOLD until all seven recipient apps independently prove real service identity enrollment, server-side resource lookups, tenant RLS negative cases, durable replay ledger, release SHA, operational authentication, message transport and acknowledgement.

**No +10 percentage-point maturity claim:** verification of source policy alone is a new capability, not measured completion across every aspect. The [coordinated modernization program](https://github.com/RosevearCreations/ai-data-platform/issues/939) tracks the per-app metrics and actual runtime gates.

**Next proposed Build 346 / QL-455 — Durable Signed Cross-Application Outbox/Inbox, Replay and Idempotency Ledger, Delivery ACK & Fail-Closed Recovery.** This is an individually gated next build, not started. The remaining planned AI Hub queue after Build 345 is Builds 346–356 (11 proposals).
