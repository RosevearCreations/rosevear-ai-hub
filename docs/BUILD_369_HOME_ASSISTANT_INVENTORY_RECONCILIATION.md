# Build 369 — Whole-home Home Assistant Inventory Reconciliation

**Date:** 2026-11-19. **Status:** source implementation awaiting protected CI and original-host runtime checks. The Hub is a local-first system; Home Assistant and MQTT retain authority.

## Actual functional change

Build 369 adds an owner-only **Whole-home inventory reconciliation** workbench in Devices. It can initiate one explicitly requested, bounded **read** of the configured Home Assistant states and registry lists (areas, devices, entities). It records source IDs and their room/device links in local SQLite. Previously registered entities with no current state remain visible as registry-only, not silently discarded. Owner-reviewed concrete MQTT topic annotations are displayed as unverified references; the Hub does not inspect topics, subscribe to MQTT, or infer a physical device from topic text.

- Durable exact-ID snapshots and claim-first reviews; owner may mark a reference claimed, investigate, unsupported, or unclaimed, with optimistic revision checks and audit events. **Claimed means owner-reviewed metadata, not pairing or physical validation.**
- Changes retained as append-only rename, room-change, new reference, source returned and not-in-registry records. A missing entry means not found in a successful bounded registry snapshot; it does not prove removal, disconnection or theft.
- Reconciliation dashboard provides source counts, missing and unavailable references, unclaimed reviews, possible same-kind name duplicates, search/filter and last source observation timestamp.
- Fail closed on HA outage, invalid/duplicate IDs, registry truncation, overly large snapshots, or a suspicious reduction of at least half of a previously recorded inventory of five or more HA IDs. Existing stored snapshots remain intact when capture fails. No periodic polling.
- Owner-only read and write APIs; no new LAN scan, router action, Home Assistant service call, MQTT publish, device adoption or remote safety control.

## Schema and runbook

Alembic **0031** follows migration 0030 and adds: `home_inventory_snapshots369`, `home_inventory_identities369`, and `home_inventory_changes369`. Before deployment on DESKTOP-AE894KC, preserve an independently verified SQLite backup and confirm current revision/head. Apply standard approved migration; do not recreate or erase existing Home Assistant/MQTT identifiers or historical claims.

After actual installed-host deployment, sign in as owner → **Devices → Whole-home inventory reconciliation** and select **Capture current HA inventory**. Inspect real areas, missing/not-available statuses and unclaimed items; verify actual Home Assistant IDs and independent device presence before setting owner claims. Repeat a supervised read after a known Home Assistant rename or sensor-offline event. If HA is unavailable, save prior evidence unchanged and report HOLD, never invent counts.

## CI, privacy, rollback, acceptance

- Backend synthetic tests: exact source IDs, registry-only entries, reviewed MQTT references, optimistic review, renames, room changes, missing/returned, duplicate guard, large-drop HOLD, role denial and offline integrity.
- Frontend tests and static CI contract confirm owner-only rendering, manual capture behavior, source-only percent score and no hardware controls.
- Source merge to `dev` and isolated `main` requires six protected checks per PR and independent `main` push verification.
- Runtime connected devices, genuine house inventory completeness and original Windows installed migration **must stay HOLD** until actual owner/independent field verification.
- Rollback reverts code and preserves migration 0031 tables for audit/backup. No HA registry entries or automations are removed.
- Updated estimated 24-module source coverage: **42.4%**; blended planning readiness **33.9%**, field estimate unchanged at **18%**. Scope-specific estimates: Home Assistant inventory 61→70%, network provenance/topology 28→33%.
- **Next Build 370 — Creality Pro 5 3D-printer process observability**. **18 builds remain** in the 370–387 programme. Do not assume the exact Creality model or firmware.
