# Rosevear AI Hub Build 283 — proposed Master Shell readiness inventory

## Brief and source boundaries

Owner directive: **Rosevear Suite — Master Shell Architecture & Integration**, provided by Ree and Jack Rosevear. This is a *proposed common architecture*, not a signed versioned integration contract. AI Data Platform owns suite-wide monitoring, evidence reconciliation, module-completion reporting and application intelligence. Rosevear Comms Hub owns message routing, incidents, follow-ups and communications. Rosevear AI Hub is the local-support source app only and must remain independent.

The supplementary uploaded document named `UI_Application_Recreation_Specification(6).pdf` describes a **generic workshop operating system** (products, inventory, requests, production, shop, reports), **not** the Master Shell protocol. Its suggestions for keyboard access, responsive dashboards, server-side authorizations, audit trails and evidence-linked KPIs are useful presentation patterns, but it cannot authorize changes to app identities, security, transport or shared schemas.

## Exact existing AI Hub integration entry points

| Boundary | Existing artifact | Scope / risk boundary |
| --- | --- | --- |
| Canonical app identity | `apps/web/public/.well-known/rosevear-integration-manifest.json` | `source_id=rosevear-ai-hub`, role `local_support`, no customer tenant, public discovery only. No new manifest identity. |
| Legacy source health and capabilities | `server/src/rosevear_ai_hub/api/integration_v1.py` | Existing API paths and server auth; does not confer new cross-app grants. |
| Protected Comms source receipt | `server/src/rosevear_ai_hub/api/ql364_source_health.py` | Original private TEST and signer/owner gates remain fail-closed unless independently satisfied. |
| Local integration health | `apps/web/src/IntegrationHealthPanel.tsx` | Manual local status reads; never an independent certificate that devices are working. |
| QL-365D acceptance contract | `scripts/ql365d-source-attachment.test.mjs` | Immutable manifest and protected source handler regression assertions. |
| Evidence-backed module baseline | `docs/BUILD_281_OWNER_FOLLOW_UP_QUEUE_AND_MODULE_BASELINE.md` | Provisional source review; no independent deployed Windows acceptance; N/A means outside AI Hub ownership. |

## Gap assessment and next steps

| Proposed capability | Implemented today | Outstanding before any shared rollout |
| --- | --- | --- |
| AI Hub module completion | Static source-review estimates with named code paths, owner-only preview. | AI Data Platform agrees on taxonomy, weights, evidence hashes, provenance, expiry and N/A handling; owner independently confirms Windows and device acceptance. |
| Machine-readable status draft | Build 283 browser-local, read-only candidate `rosevear.ai-hub.master-shell-candidate.v0`. | Joint schema review; server-issued signed envelope, auth/audience, replay/idempotency, retention and transport; never treat the candidate as approved API. |
| Many-to-one status to AI Data Platform | Existing integration API and public discovery can be inspected. | Approved authenticated receiver, allowlisted fields, service identity, cadence, freshness, backoff, source consent and independent exchange receipts. |
| One-to-one Comms operations | QL-365D public source manifest and protected source health handler exist. | Preserve original proof and owner scopes; verify actual private handshake independently; historical QL-275 checklist is not a blanket current connection status. |
| One-to-many / many-to-many event routing | No Build 283 cross-app publisher is activated. | Contracts per publisher/recipient and tenant, publish/subscribe scopes, routing policy, incident dedupe, revocation and human approval. |
| Production health | GitHub CI and manual local service health are separate. | Exact running source SHA, Windows startup identity, HA/MQTT/Ollama/device/camera checks, secure delivery to recipient and owner field acceptance. |
| Security and data privacy | Server auth and audit plus owner-only I.T. screen; candidate excludes device URL, token, private notes and raw incident records. | Independent threat model, authenticated least-privilege delivery, negative access tests, tenant boundaries and encrypted transport/recovery. |

## Build 283 delivered behavior

- Adds **Master Shell proposed reporting and integration gap assessment** in the existing owner-only I.T. integration workbench. It is collapsible, so routine Hub operations are not blocked by old prelaunch checklists.
- Records AI Hub-only provisional module estimates with evidence paths and missing field proofs; non-Hub customer, worker, financial, commerce, advertising and social modules report **N/A**, not zero.
- Provides a local JSON *schema example* via explicit preview. It neither reads secrets nor uploads anything or changes the existing QL-365D manifest/connection handler.
- Treats all four integration flow shapes as policy/protocol work requiring coordination with AI Data Platform and Comms Hub; does not silently activate direct or fan-out communication.

## Acceptance / no-claim rules

1. Unit test candidate version, exact source identity, N/A behavior, bounded percentages and distinct source versus deployed evidence.
2. Verify owner-only navigation and local preview; no network side effects, API grants, device secrets or recipient identity changes.
3. Verify the prior QL-365D source manifest and handler contract tests stay green.
4. Require all protected source and production GitHub checks green for the final SHA.
5. Never describe a passing repository CI run as live installation on Ree's Windows server, functioning devices or complete cross-app connection.

**Proposed next coordinated build:** after architecture-owner ratification, implement an authenticated, signed, versioned and explicitly scoped AI Hub status-report publisher with independent receiver receipts and freshness checks. Until then the transport is **NOT ACTIVATED**.
