# Build 141 — Camera Wall V2: Room Groups, Health & Private Views

## What changed

- Cameras now has an accessible responsive wall grouped by the **exact camera ID** and its owner-reviewed Device 360 room annotation. No implicit join to HA entities, Frigate names or ONVIF names is trusted. If annotation reads fail, the wall says assignments are unavailable and retains separate registry cards.
- Every camera retains a readable health label and last probe timestamp. Unconfigured, disabled, failed, stale and unknown video are honest holds; one unavailable camera does not block the others.
- There is **one** optional large viewer at a time. Video stays off until an individual explicit Start private preview click. Switching cameras replaces the iframe, hiding the browser tab stops it, and loss of stream eligibility closes it. The prior Build 116 field playback acceptance is a mutually exclusive workspace: navigating to it unmounts the wall and closes its iframe, and vice versa. The existing playback assessment requires an enabled encrypted registered stream, current matching health/identity, a recent successful probe, loopback-only go2rtc listeners and a localhost browser. Preview never changes registry enablement, stream configuration, recordings or service ports.
- The wall has room, Favorites only and Compact cards controls. A deliberate **Save private layout** stores a bounded list of up to 24 registered camera IDs plus density under the authenticated **current user ID** using `GET/PUT /api/v1/camera-wall/preferences`. The private preference table is protected by a per-user foreign key and optimistic revision; it contains no password, RTSP address, stream name, saved image, active preview or clipboard data. Read-only accounts can change only their own layout.
- There is no approved authenticated latest-still endpoint with trustworthy mapping between an exact registered camera and a Frigate camera. The wall explicitly says the still is unavailable rather than auto-requesting media, guessing an identity or exposing local image URLs. A future reviewed snapshot endpoint may add optional still previews after source identity/role/bandwidth design and tests.
- Client-facing network and transport errors on the camera page are generic, excluding backend exception content that might contain connection addresses or secrets. Private camera addresses in configuration are visible only to Owner/Admin; the new wall does not render addresses.
- Circled-i help covers assignment, user preferences, privacy gating, certificate/transport troubleshooting and field acceptance.

## Database and safety boundaries

Migration `0025_camera_wall_preferences` follows `0024`, adds only `camera_wall_preferences`, and downgrades by dropping only that layout table (preferences are lost on downgrade; back up first). Existing Camera, Stream, Device 360, Frigate and HA source records are unchanged. Server validation checks exact registered positive camera IDs, no duplicates, maximum 24 IDs, and conflict revisions. Authentication and role requirements are enforced on every request. A preference does not authorize playback.

## Acceptance

1. Web tests cover reviewed room IDs, unassigned fallback, responsive group controls, no iframes on mount, exactly one private playback iframe after explicit clicks, replacement on camera switch, health holds, redacted display and preference payloads without media URLs.
2. API tests cover authentication denial, separate per-account preferences including read-only accounts, repeat-edit conflict, missing or duplicate ID rejection, bounded lists and additive Alembic 0024 → 0025 → 0024 round trip.
3. Run full Python ruff/pytest and web typecheck/Vitest/build, plus independent five-job GitHub checks on feature PR, `dev` push, promotion PR and `main` push. Source GREEN is not proof that any Windows camera played live video.
4. On the household Windows machine, **after separate owner-directed local update**, verify real Frigate/go2rtc health, actual room labels, disabled/failed stream holds, local-browser preview and certificate behavior on at least two known cameras. No real camera probe, local server update, router change or Windows acceptance is executed by GitHub CI.

The local password/document vault remains **HARD SECURITY HOLD: 0 / 6 verified**. Build 142 — Camera Events & Evidence Playback Workbench V2 — is next in the queue.
