# Build 074 — Server-Backed Camera Inventory & Authorization Ledger

## Scope
Additive migration 0019 stores camera compatibility model, proposed connection method, evidence text, revision, owner/admin approval identity and timestamp. Separate append-only ledger stores create/update/approval transitions with actor IDs and exact revisions; central audit events capture only IDs/status (no stream URL or credentials).

Authenticated endpoints:
- GET /api/v1/camera-compatibility — household-readable, 100-record bounded
- POST /api/v1/camera-compatibility — owner/admin create
- PUT /api/v1/camera-compatibility/{id} — owner/admin edit, revision increment and revocation of approval
- POST /api/v1/camera-compatibility/{id}/approve — owner/admin approval of a documented proposed method, 409 on repeat
- GET /api/v1/camera-compatibility/{id}/ledger — bounded, authenticated evidence

## Safety
Planning approvals authorize NO physical device action, streaming, credential collection, ONVIF discovery, MQTT/HA commands, Frigate writes or Alexa stream extraction. Existing Camera/CameraStream registries are separate and unchanged. Evidence must never contain passwords, tokens or RTSP URLs.

## Operations
The live Windows Hub database must be backed up, reviewed, and migrated under the established controlled installer workflow before using the endpoints. A GitHub merge does not migrate the Windows installation.
The Cameras page includes a separate server-backed inventory and ledger viewer. The Build 073 browser-local compatibility worksheet remains available but is not automatically imported or synchronized, to avoid silent server ledger overwrites. Review and re-enter approved models explicitly.

## Validation
Require Alembic upgrade/downgrade, owner/admin/household/read-only authorization, revision invalidation, replay prevention, audit sanitization and five GitHub CI lanes; verify the independent post-merge main run. Local machine/HA/MQTT/go2rtc remain undisturbed.

## Next build candidate
Build 075 — Camera Inventory UI Server Adoption, Migration Acceptance & Conflict-Safe Import.
