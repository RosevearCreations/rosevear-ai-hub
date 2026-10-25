# Build 139 — Device 360 Registry, Identity Matching & Room Assignment

## User workflow

The authenticated **Devices** screen now contains a source-aware **Device 360 registry** above the existing recovery workbench. It assembles a bounded view of the latest Home Assistant device and entity directory, registered cameras and **explicitly owner-reviewed** MQTT topic references. Search matches a display name, source ID or room; source, room and observed/attention/unknown/missing/unsupported filters narrow the list. Selecting an entry shows the original provider ID and room, provenance, capabilities, last source observation and any allow-list eligibility. A missing annotated device links to the existing device/camera recovery workbench.

The four registry kinds (`ha_device`, `ha_entity`, `camera`, `mqtt`) have different identity namespaces. Home Assistant entity IDs are distinct from Home Assistant device IDs; a camera retains its existing internal camera record ID. The displayed count is **source identities**, never a count of independently verified physical devices. Changed IDs create separate records; the old annotated ID remains visible as missing only when that provider's inventory is successfully fetched, otherwise it is labeled unknown/unverified.

Owner/Admin can:

1. Add or revise a **Hub-only** alias, room label (from existing HA area choices) and reviewed / investigate / unsupported classification using optimistic revisions.
2. Review exact-normalized cross-provider name collisions as **may be related**, **keep distinct**, or **investigate**. These are durable notes, not joins, merges, hardware identification or authority to operate.
3. Record a concrete **non-secret MQTT topic** reference only after acknowledging that it does not configure broker mappings, subscribe, publish, pair or adopt anything.

The UI never calls HA device controls, camera stream start or MQTT publishing as part of registry review. Physical operations remain behind their pre-existing explicit, separate policies. Read-only and household users may inspect the registry but cannot save any review. All authenticated users can see read results; only Owner/Admin can write. Review changes produce audit events without storing metadata or topic text in audit arguments. An unavailable backend fails closed for saving notes.

## Data, migration and failure boundaries

- Migration `0023_device_registry_reviews` adds two independently versioned tables, `device_registry_annotations` (one per exact source identity) and `device_registry_match_reviews` (one per canonical unordered pair). It does **not** modify existing `cameras`, HA records, MQTT configuration or device pairing tables. Reversion drops only these new review tables and would discard their new review notes, so back up before intentionally downgrading.
- The API uses `GET /api/v1/device-registry/reviews`, `PUT /api/v1/device-registry/annotation`, and `PUT /api/v1/device-registry/match-review`. Conflict on stale `expected_revision` returns HTTP 409. Self-pairs and wildcard MQTT topics are rejected. Exact source IDs are persisted, separate from provider connection information.
- Lists are bounded (HA up to 400 devices / 1000 entities, cameras up to 400, 500 reviewed annotations and 500 match reviews); the visible results are capped at 100 pending search refinement and suggestions at 30. An absent provider response is **unverified**, never confirmation of deletion.
- The original Home Assistant directory, camera registry and recovery records are immutable to these endpoints. Privacy-sensitive camera URLs, hosts, RTSP credentials, MQTT payloads and raw exception content are deliberately absent from the new view. Only source IDs and labels are displayed; operators must not enter passwords or secrets into note fields.
- Schema revisions are additive and local; no cloud deployment, paid product, background scan, re-pairing, VM repair, changes to Windows startup or default automations are needed.

## Acceptance and release verification

- Frontend: compile/source boundaries, camera health and safe-control policy-derived eligibility, annotation overlays, absent-vs-unavailable and ID rotation, MQTT review-only listing, collision suggestions, role-aware editor, explicit topic acknowledgement, filtering and no credential URLs.
- Backend: authenticated metadata review and stale-version conflict; order-independent match decisions without merges; readonly denial, wildcard/secret rejection, camera record non-mutation; Alembic 0022 → 0023 → 0022 reversal while preserving camera rows.
- Repository checks: web typecheck, Vitest, web production build, Python lint/test/migration, documentation and five distinct CI jobs on each promotion boundary. Record the final `main` workflow GREEN separately from any live Windows server rollout.

**Field acceptance is still separate.** After Windows installation, manually verify Home Assistant IDs and room names, camera records, owner role, broker/topic references and missing-device recovery against the actual physical household equipment. GitHub `main` GREEN cannot attest that the Windows test server is updated, that physical devices are safe or that the security-gated first-party password/document vault is authorized. The vault remains **HARD SECURITY HOLD (0 / 6 independently verified)**.
