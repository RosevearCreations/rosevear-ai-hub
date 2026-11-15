# Coordinated seven-application expansion queue — Rosevear AI Hub Builds 345–356

**Owner direction:** Advance overall application maturity by a *target* of at least **10 percentage points in every measured functional/security/operational area** across all seven apps, while facilitating secure communications. This is a planning target, **not an already achieved improvement, a prediction of completion time or a guarantee**. Build 344 / QL-453 is the entry gate.

## Canonical order and application roles

1. \`ai-data-platform\`: top-tier Master Shell validation, shared schema/version registry, independent acceptance aggregation.
2. \`rosevear-ai-hub\`: independent local Windows Master, protected original-host witness/authorization, controlled communications adapter.
3. \`rosevear-comms-hub\`: independent Master for inbox, tasks, operator routing, delivery/acknowledgment and incident workflows.
4. \`iCamp\`: campground SaaS shell; Camp Rosevear is a tenant.
5. \`yw\`: Yard Workers SaaS shell; Rosevear Landscaping is a tenant.
6. \`devilndove-site\`: Devil n Dove shop, products, media, customer service and social integrations.
7. \`rosiedazzlers\`: Rosie Dazzlers bookings, deposits, photos, quoting and job operations.

A rollout must carry \`schemaVersion\`, source/receiver identity, \`correlationId\`, unique message/receipt ID, signing-key ID (public), tenant/role scope, content digest, signed timestamps, expiry, owner decision, previous hop and delivery ACK. Private keys stay at source. Source CI GREEN, verified deployment and genuine runtime handshake are **three separately measured facts**.

## Six-tier access control (shared vocabulary)

- **T0 PUBLIC_READ:** public brochures, storefront and help (no protected customer data).
- **T1 USER_SCOPED:** authenticated customers/guests/staff; only their own resources.
- **T2 TENANT_SCOPED:** company/campground tenant staff; explicit tenant ownership enforced in API, database and storage.
- **T3 OPERATOR_SCOPED:** company administrators and delegated operators; approval boundaries, least privilege, audit.
- **T4 MASTER_GOVERNANCE:** independently authenticated three-Master signatures, replay protection, freshness, no trust transitivity.
- **T5 ORIGINAL_HOST_OWNER_CEREMONY:** protected on-machine independent physical receiver witnesses and owner-gated closure. Never routed through ordinary HTTP, a queue, Cloudflare, Vercel or a customer account.

T0–T4 cannot grant T5. Even a signed T4 event with a verified envelope does not mean message *delivered*, user *authorized*, or physical receiver *OFF*. Default every missing custody/transport/status to \`NOT_VERIFIED\` / \`HOLD\`.

## Twelve gated build proposals — Build 345 in source implementation, Builds 346–356 queued

| AI Hub build / QL | Principal deliverables | Seven-app acceptance / negative tests |
|---|---|---|
| **345 / QL-454** | **Source implementation in progress:** signed principal and six-tier policy evaluator, exact resource/tenant/company scope, owner audit registry. Does not enroll live issuers or activate cross-app enforcement. | Synthetic seven-app negative tests and exact production CI gate; all seven real app APIs/RLS must independently adopt and verify later. |
| **346 / QL-455** | Versioned event schemas, signed outbox/inbox and durable nonce replay journal; retry/backoff, idempotency, delivery ACK, dead-letter handling and audit. | All seven ingest schema test fixtures; duplicate/stale/forged messages rejected; recoverable outage tests; delivery separately measured, no live rollout without keys. |
| **347 / QL-456** | Per-app identity registration, scoped service accounts, key rotation windows, revocation propagation, certificate/key custody and expiry alarms. | Three Masters attest separate public identities; every downstream app proves revoked/expired/wrong-audience denial; key rotation dry-run and rollback. |
| **348 / QL-457** | Tenant isolation audit of iCamp and YW, separate internal-company Rosie/Devil boundaries, Postgres row-level policies, storage rules and audit trails. | Cross-tenant query/storage tests across every role and relevant object, data migrations safely reversible, zero leakage; independently audited environment. |
| **349 / QL-458** | Media and artifact pipeline: photo/video intake drafts, signed uploads, dedup, retention, malware/file constraints, CDN protection, accessible previews. | iCamp site images, YW job photos, Devil products/socials and Rosie booking/job photos survive retries and owner review, never mix tenant media. |
| **350 / QL-459** | Unified Comms Hub inbox, customer/job/task timelines, operator acknowledgments, scheduled follow-ups and workflow orchestration. | Every app can create a scoped test event, verify acknowledgement/timeout, and follow original source; no duplicate task/booking or unauthorized message. |
| **351 / QL-460** | Finances: booking deposits/payments, invoices, tax reconciliation, refunds, fee custody, ledger exports and provider-boundary review. | Double-entry reconciliation where applicable; provider sandboxes, negative payment cases, retention/privacy, currency/tax clarity; no false 'paid' status. |
| **352 / QL-461** | Seven-app observability: uptime, health, queue lag, schema drift, source receipt SLA, guarded alerts and independent incident ownership. | Separate code-green/runtime-green/CONNECTED states, latency/error/queue metrics from real signed probes, actioned incidents with owner ACK and no false closure. |
| **353 / QL-462** | Mobile/offline field workflows, dark and accessible Master Shell navigation, responsive customer/worker/admin devices, safe recovery. | Keyboard, zoom, contrast, screen-reader, offline/draft replay and no-duplicate submit at target device sizes; tenant/role boundaries preserved. |
| **354 / QL-463** | Security operations: dependency & SBOM checks, branch protections, secrets inventory, break-glass rehearsals, backups/restore and incident runbooks. | Pen-test-style negative tests, realistic restore rehearsal, rotation evidence, emergency stop and recovery records; no raw secrets in logs. |
| **355 / QL-464** | Instrument-style unified shell, owner dashboards, task and module completion scorecards, drilldown from top Master through Masters to shells/companies. | Each app exposes its own measured progress, missing assets, module ownership, current deployment SHA and blockers; no synthetic green badges. |
| **356 / QL-465** | Seven-app end-to-end readiness campaign: release train, signed handoff contract testing, staging smoke runs, controlled pilot, rollback and owner-approved gates. | Full trace from source→Master→Comms→iCamp/YW/Devil/Rosie; authenticated delivery and audit independently proven per hop; T5 hardware remains physically gated. |

Each application retains its **own existing build numbers**; these are the AI Hub coordination build identifiers, not renumbering or implicit permission to merge changes into other repos.

## Quantified improvement methodology — no fabricated percentages

For **each application and each relevant aspect** (customer/guest, worker/admin, product/storefront, finance & tax, stock/inventory, scheduling/jobs, HR/payroll, media/social, security/privacy, cross-app integration, accessibility/mobile, deployment/recovery, observability/support), capture:

1. **Baseline:** count applicable requirements \`N\`, verified implemented requirements \`P\`, genuine environment evidence, test suite and current exact production SHA. Mark unsupported/untested data \`UNMEASURED\`, never 0 or 100 by assumption.
2. **Formula:** \`completion% = 100 × verified implemented requirements / applicable requirements\`. Freeze denominator per audit snapshot. Newly scoped requirements affect both baseline and target transparently.
3. **Target:** \`target_completion% = min(100, baseline_completion% + 10)\` **percentage points**, for *each* assessed aspect. E.g. 40% baseline means 50% target, not 44%. This is a target until tested and accepted.
4. **Security gate:** no aspect advances into "verified" if T0–T5 policy, source provenance, tenant isolation or provider ownership is unknown, even if UI tests pass. Keep missing dependencies as blockers.
5. **Evidence:** attach PR, exact SHA, CI workflow, staging/runtime smoke proof, independent tenant/role negative tests, physical/owner witness (if needed), and release rollback before claiming a gain.

**Progress is reported per app/aspect; do not average away missing functions or claim a 10-point increase across the entire suite from a single source build.** At least one end-to-end realistic operating workflow per application must be demonstrated before its integration aspect is accepted.

## Shared release dependencies and sequence

- **Build 344:** source contract and historical signed follow-up accepted; runtime signer enrollment, actual cross-app message transport and receiver OFF remain separate HOLD.
- **345–347:** identity policy, durable signed messaging, key custody must be independently proven by all three Masters *before* trust is extended to shells and internal businesses.
- **348–352:** gated tenant/media/financial/Comms integrations use temporary staging credentials and least-privilege service accounts, not shared owner secrets.
- **353–356:** multi-device QA, operational hardening, owner-visible scorecards and release/rollback with no unexpected provider charges, receiver activation or customer data exposure.

**Coordination home:** [AI Data Platform seven-app canonical issue #935](https://github.com/RosevearCreations/ai-data-platform/issues/935). Build-specific work tickets should link back and include exact repo/build, block reason and final verified status. Do not auto-merge the full 12-build queue or claim future completion without its individual acceptance.
