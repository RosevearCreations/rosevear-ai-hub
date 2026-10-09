# Build 034 — Frigate Adapter

## Status

Implementation complete on dev; promotion evidence is recorded in BUILD_STATUS.

## Scope

Build 034 adds an optional, read-only Frigate integration beside the existing ONVIF/go2rtc camera
stack.

- loopback-only Frigate HTTP adapter
- Frigate service/version status
- normalized configured-camera capability inventory
- bounded recent object-event retrieval
- strict event response normalization
- Frigate panel inside Cameras
- Frigate outage isolation from camera dashboard and other Hub subsystems
- no schema migration
- no new Hub secret in the supported local-internal mode
- backend and web coverage
- operator, architecture, integration, and security documentation

## Supported endpoint boundary

The supported Build 034 endpoint is:

`FRIGATE_BASE_URL=http://127.0.0.1:5000`

The adapter requires HTTP on localhost/loopback. It rejects:
- public IPs
- private/LAN IPs
- arbitrary hostnames
- embedded URL credentials
- query strings
- URL fragments
- malformed ports

This is deliberate because Frigate's internal integration API is an unauthenticated trusted-network
surface. Build 034 does not weaken that boundary to support another host.

## Read-only contract

The Hub performs only bounded GET operations for:
- Frigate version/status
- current Frigate camera configuration metadata
- recent Frigate events

The adapter does not:
- change Frigate YAML/configuration
- start/stop recordings
- delete or retain events
- change sub-labels/descriptions/classifications
- manage Frigate users
- submit to Frigate+
- control cameras
- expose Frigate directly to the browser

## Event normalization

Recent events are reduced to:
- event id
- camera name
- label
- optional sub-label
- start/end timestamps
- zones
- clip/snapshot availability flags
- false-positive flag
- optional score

Arbitrary event payload fields are not passed through to the browser. Results are bounded to at most
100 events; the default is 20.

## Optional dependency behavior

Frigate is not required for Rosevear AI Hub startup. If Frigate is absent or unavailable, the
Frigate panel reports an offline state while ONVIF discovery, go2rtc live viewing, camera health,
Home Assistant, MQTT, chat, knowledge, and other Hub capabilities remain available.

## Configuration

Defaults:
- `FRIGATE_BASE_URL=http://127.0.0.1:5000`
- `FRIGATE_TIMEOUT_SECONDS=5`
- `FRIGATE_EVENT_LIMIT=20`

No new secret is required for the supported loopback internal mode.

## Schema impact

None. Build 034 does not persist Frigate cameras or events.

## Rollback

Deploy Build 033. No database downgrade is required.

## Next build

Build 035 — Camera Event Automations will define durable event ingestion/deduplication and how
Frigate events may participate in deterministic automation rules.
