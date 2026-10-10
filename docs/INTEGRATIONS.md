# Integration Catalogue

## Home Assistant
**Priority:** Highest  
**Role:** Primary IoT abstraction layer  
**Initial access:** Read + approved low-risk controls

Why: prevents permanent custom integrations for every Meross, Govee, Gosund, sensor, switch, light, and future device brand.

Build 021 establishes the first real connector boundary:
- `HOME_ASSISTANT_URL` supplies the non-secret base URL
- the token is resolved through Build 020 secret management
- the server sends `Authorization: Bearer ...` directly to Home Assistant
- `GET /api/` is used for health
- `GET /api/states` supplies the basic read-only entity inventory
- the browser never receives the token
- device-service writes are intentionally absent until Build 023

Build 022 adds the authenticated Home Assistant WebSocket API for read-only area, device, and entity registry discovery. Live state still comes from REST. The Hub joins those sources into a normalized entity browser and redacts secret-like attribute values before they reach the UI.

## MQTT
**Priority:** High  
**Role:** Local event/device messaging  
**Security:** Authenticated broker + topic allow lists.

Build 025 implements the first MQTT connector boundary:
- broker host/port and optional TLS are non-secret runtime configuration
- username is configuration; password is resolved through Build 020 secret management
- username + password are required before the connector is considered configured
- subscriptions and publishes are rejected unless permitted by `MQTT_ALLOWED_TOPICS`
- wildcard subscriptions must exactly match an allow-list filter
- concrete publish topics may be authorized by an allow-listed wildcard filter
- retained publishes are blocked
- reconnect delay is bounded and active subscriptions restore after reconnect
- recent received messages are held only in a bounded in-memory buffer
- the browser never receives the MQTT password and never connects directly to the broker
- MQTT is not registered as an AI tool in Build 025

## Ollama
**Priority:** Highest  
**Role:** Local inference and embeddings.  
**Provider key:** `ollama`  
**Privacy:** Local-only.

Build 009 wraps Ollama in the provider-neutral AI interface.

## Optional cloud AI
**Priority:** Optional  
**Role:** More capable models for selected tasks when explicitly enabled.  
**Rule:** Cloud usage must be visible/configurable.

Build 009 defines the adapter contract only. No cloud adapter is registered, no credentials are required, and no chat data is sent to an external AI provider.

## ONVIF
**Priority:** Medium  
**Role:** Camera discovery and capability inspection.

Build 031 implements bounded WS-Discovery for local ONVIF network video devices:
- discovery is initiated server-side by Owner/Administrator only
- the standard multicast Probe is used for device discovery
- endpoint UUID, local device-service URL, host/port, types, scopes, display name, and last-seen time are normalized into the local camera registry
- discovery responses are filtered to literal private/link-local/loopback service addresses
- discovery metadata is persisted without camera credentials
- registry viewing is authenticated; registry enable/disable administration is Owner/Administrator-only
- no RTSP transport, video proxying, PTZ, or camera device writes are introduced

Build 032 owns RTSP/go2rtc transport and must not assume that a discovered ONVIF device is safe to stream without additional validation.

## RTSP / go2rtc
**Priority:** Medium  
**Role:** Local stream transport.

Build 032 implements the local transport boundary:
- go2rtc HTTP API access is accepted only through localhost/loopback
- the supplied Windows config template binds API, RTSP, and WebRTC listeners to loopback
- camera RTSP/RTSPS sources must resolve from literal private/link-local/loopback IP addresses
- source URLs may contain camera credentials, but the full value is encrypted in Hub SQLite and never returned after save
- Hub-managed camera streams are patched directly into go2rtc runtime memory and are not persisted into go2rtc YAML
- Owner/Administrator can configure, remove, reconcile, and probe streams
- lower authenticated roles can inspect sanitized transport metadata only
- no PTZ, talkback, reboot, firmware, public publishing, or cloud streaming is introduced
- Build 033 adds the multi-camera local dashboard, loopback viewer URLs, freshness classification, and Owner/Admin fleet health probes
- live-view URLs contain only the stable stream name; camera source credentials remain server-side
- dashboard metadata polling does not trigger active probes; explicit health refresh does
- Build 034 owns the Frigate adapter and event analytics

## Frigate
**Priority:** Medium  
**Role:** Optional local NVR/object-event system.

Build 034 adds a read-only adapter with a strict local boundary:
- default internal API endpoint: `http://127.0.0.1:5000`
- FRIGATE_BASE_URL must remain HTTP on localhost/loopback
- service/version health is read from the Frigate API
- configured camera names and detect/record/snapshot capability flags are normalized for display
- recent events are bounded to 1–100 records and normalized to event id, camera, label, sub-label, timestamps, zones, clip/snapshot flags, false-positive flag, and score
- the browser talks only to the Hub API; it never receives a Frigate base URL that it must call directly
- Frigate outages are isolated from the existing ONVIF/go2rtc camera dashboard
- no Frigate configuration write, event mutation, retention mutation, recording control, user management, or Frigate+ submission is implemented
- Build 035 owns camera-event automation ingestion and rule integration

The internal Frigate port is intentionally treated as a trusted local-only integration surface. Do
not expose or port-forward it.

## Alexa
Alexa is an endpoint for voice/announcements, not the central automation bus. Prefer Home Assistant as the control layer.

## Meross / Govee / Gosund
Prefer Home Assistant integrations. Direct adapters require a documented reason.

## Bell / Qolsys / Alarm.com equipment
Separate research track. Do not factory-reset equipment until:
- exact models are documented
- ownership/release status is known
- local reuse options are understood

## Blink
Treat as vendor-constrained. Do not assume RTSP/ONVIF access.

## Littlelf and similar cameras
Research exact model capability. Prefer legitimate local RTSP/ONVIF when exposed.

## Devil n Dove
Read-only first. Writes require explicit API contracts and confirmation.

## Rosie Dazzlers
Read-only first. Avoid duplication of booking/customer/operations data.

## YW
Read-only first. Avoid duplication of job/crew/operations data.


## Build 023 safe Home Assistant writes

The Home Assistant adapter now exposes only three bounded write families to the Hub:
- light on/off
- switch on/off
- scene activation

There is no generic domain/service execution method in the application API. The caller must pass
through the Build 023 entity allow list, tool-registry risk contract, role checks, and audit layer.


## Build 024 natural-language Home Assistant path

The Home chat profile now has a deterministic pre-provider command layer. Recognized explicit home
imperatives are resolved against current Home Assistant state and the Build 023 safe-control allow
list, then routed through the same bounded light/switch/scene methods.

The AI provider is bypassed for recognized commands. Ordinary Home-profile questions still use the
configured provider normally.


## Build 027 automation event sources

The Event Engine reuses the existing Home Assistant and MQTT adapters rather than introducing new
credentials or a second IoT authority.

- Home Assistant uses an authenticated WebSocket `subscribe_events` request limited to
  `state_changed` events.
- MQTT reuses the Build 025 authenticated client and registers an in-process message listener.
- Enabled MQTT rules are reconciled to authorized broker subscriptions while the broker is online.
- MQTT topic policy remains governed by `MQTT_ALLOWED_TOPICS`; the Event Engine cannot widen it.
- Home Assistant actions still pass the Build 023 tool, allow-list, domain, and hazard checks.
- Source outages are isolated from chat/knowledge and use bounded reconnect/reconciliation loops.


## Build 035 Frigate event source for automations

Build 035 reuses the Build 034 loopback-only Frigate adapter as a deterministic event source.

- event polling starts only while at least one enabled frigate_event rule exists
- FRIGATE_EVENT_POLL_SECONDS defaults to 2 seconds and is bounded to 1–60 seconds
- each poll remains bounded by FRIGATE_EVENT_LIMIT
- the first successful poll creates a baseline without executing historical events
- subsequent unseen event IDs enter the Event Engine in chronological order
- rule filters may match label and optionally camera, sub-label, zone, score, clip/snapshot state,
  and false-positive inclusion
- Frigate events can use existing Home Assistant state conditions
- actions remain restricted to already-supported deterministic Level-1 tools
- event IDs are automatically deduplicated per automation
- Frigate remains read-only; Build 035 does not mutate Frigate or camera state directly

Build 036 begins the business Connector Framework and is separate from camera integrations.


## Build 036 business connector framework

The Phase 7 business integrations now share a common connector contract and registry.

- stable connector key and human-readable name
- explicit planned implementation build
- read-only or approved-write access mode
- bounded capability declarations
- normalized configured/available/state/message health
- normalized safe connector errors
- no raw token, cookie, provider response, or exception exposure in the browser contract
- writes blocked by default in the base class
- metadata declares that any future write path requires confirmation
- Devil n Dove is reserved for Build 037
- Rosie Dazzlers is reserved for Build 038
- Yard Workers is reserved for Build 039
- Build 040 owns any narrow approved business write

Build 036 performs no external network request and introduces no credential or secret definition.


## Build 037 Devil n Dove read connector

Build 037 activates the first Phase 7 business connector without copying mutable shop truth into the
Hub.

- default remote origin: `https://devilndove.com`
- remote origins require HTTPS; loopback HTTP remains available for local testing
- authentication uses an existing Devil n Dove admin session credential as a server-side Bearer value
- the credential may come from `DEVILNDOVE_ADMIN_TOKEN` or the encrypted Build 020 Secrets store
- the browser never receives the credential and never calls Devil n Dove directly
- catalogue reads use `GET /api/admin/product-picker` and are capped at 50
- order reads use `GET /api/admin/orders` and are capped by the Hub at 100
- inventory reads use `GET /api/admin/contracts/inventory-read` and are capped at 100
- Inventory tool rows are excluded from the Build 037 read by default
- upstream records are normalized instead of being passed through wholesale
- connector status does not probe the shop; network access occurs only after an explicit read
- all write operations remain blocked by the Build 036 connector contract

The current credential is an administrator session secret, not a permanent service key. It can
expire or be revoked and must be rotated when that occurs. A future dedicated service credential
should replace it if Devil n Dove defines one.
