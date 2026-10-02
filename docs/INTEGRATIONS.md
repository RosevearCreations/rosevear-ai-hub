# Integration Catalogue

## Home Assistant
**Priority:** Highest  
**Role:** Primary IoT abstraction layer  
**Initial access:** Read + approved low-risk controls

Why: prevents permanent custom integrations for every Meross, Govee, Gosund, sensor, switch, light, and future device brand.

## MQTT
**Priority:** High  
**Role:** Local event/device messaging  
**Security:** Authenticated broker + topic allow lists.

## Ollama
**Priority:** Highest  
**Role:** Local inference and embeddings.

## Optional cloud AI
**Priority:** Optional  
**Role:** More capable models for selected tasks when explicitly enabled.  
**Rule:** Cloud usage must be visible/configurable.

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
