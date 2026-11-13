# Rosevear AI Hub Build 330 — QL-439 and Rosevear Master Shell instrument design

## Release dependency and safety boundary

Build 330 must not be merged before the QL-438 Build 329 corrective lease exception closure code is implemented, checked and independently promoted to GREEN on exact production main. The QL-439 handoff source is the Comms Hub `docs/handoffs/QL439_MASTER360_RENEWED_ANCHOR_OFF_REENTRY_READINESS.md`. QL-439 is **new-ceremony readiness only**, not receiver activation, not general CONNECTED, and not original-host physical runtime evidence.

QL-439 requires DESKTOP-AE894KC exact protected QL-431–438 receipts (including QL-438 PENDING/CLOSED), unique new ceremony/episode/nonce, one-use fsynced PENDING before external calls, independent signed renewal anchor and different signed reader, original-host signed watchdog-armed OFF, separate monotonic signed independent receiver OFF, three distinct signed Master readiness reports, dual owner/reviewer preparation-only signatures, protected one-use READINESS final receipt and private restart readback that explicitly does **not** imply current OFF. All results retain `connection=HOLD`, `activationAuthorized=false`, `slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`. Synthetic CI never claims live custody.

## Owner-supplied visual authority

Reference: *Generic Workshop Operations Application UI & Workflow Recreation Specification*, 31-page owner-provided PDF dated/uploaded November 2026. The screenshots are a visual hierarchy and interaction reference, not functional sample data or a mandate to apply generic workshop entities to every business. The reference specifically calls for shared shell first (pp. 25–26), role-audited data-backed services (pp. 27–30) and responsive acceptance (p. 31).

### Adopt these visual primitives

- Deep navy/black base; purple current navigation and primary actions; blue information; green healthy; amber warning; red critical; grey neutral.
- Persistent desktop top brand/release identity and left workspace rail; responsive rail to mobile horizontal/drawer navigation.
- Dark cards with thin cool-tone borders, icon tile at left, prominent real metric, compact secondary text and optional miniature trend.
- Hero title/subtitle with clear current module identity. Grouped launcher cards and narrow meters when an actual sourced percent exists.
- For deeper modules, same style applied to sortable data tables, Kanban, queues, capacity, calendars, report cards, audit events and inspector drawers.
- Component states must support actual loading, empty, error, permission denied and HOLD without inventing numbers.
- No visual color alone conveys state; status text and accessible labels remain mandatory.

### Shared shell ownership, not duplicate business backends

The **AI Data Platform** remains intelligence/monitoring Master; **Rosevear Comms Hub** remains communication/operations Master. Yard Workers and iCamp retain **product-shell** oversight separately from individual tenant operations; Devil n Dove and Rosie Dazzlers retain their own product/business workspaces. AI Hub retains original-host device/runtime responsibility. A design system must not bypass tenant segregation, backend authorization, secret handling or owner gates.

### Scope of the current UI commit

`apps/web/src/MasterCommandVisualSystem.tsx` and `masterCommandVisualSystem.css` are a scoped presentational component and opt-in tokens for the shared shell. They intentionally do not replace existing application routes or fabricate operational readings. Wiring source-backed snapshots and the redesign across all six applications is further work; a one-repository visual component cannot prove those other applications were updated.

### Acceptance gates

- Build 329 exact production `main` GREEN first.
- QL-439 code-level signed evidence chain and adversarial replay/forgery/unknown OFF tests must exist; a design component is not a substitute.
- CI 6/6 GREEN on source PR, dev merge, isolated scoped main candidate PR and exact `main` push; verify production deployed result separately.
- No unreviewed wholesale merge of diverged dev history into production; no new receiver control or unauthorized change to runtime status.
- For the visual rollout: responsive desktop/tablet/mobile, keyboard and contrast checks, no invented KPIs, navigation semantics, and reusable design tokens applied to each Master/child shell under its own permission model.

**Next proposed Build 331 — QL-440 Fresh Original-Host Ceremony Authorization Issuance, Independent Receiver OFF Revalidation & Three-Master Activation-Prerequisite Decision.**
