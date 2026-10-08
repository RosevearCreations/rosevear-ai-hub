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

## RTSP / go2rtc
**Priority:** Medium  
**Role:** Local stream transport.

## Frigate
**Priority:** Medium  
**Role:** Optional local NVR/object-event system.

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
