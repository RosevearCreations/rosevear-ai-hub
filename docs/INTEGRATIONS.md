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

## MQTT
**Priority:** High  
**Role:** Local event/device messaging  
**Security:** Authenticated broker + topic allow lists.

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
