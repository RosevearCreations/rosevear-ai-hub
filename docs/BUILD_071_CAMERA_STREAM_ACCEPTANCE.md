# Build 071 — Camera Transport Configuration & Verified Stream Acceptance

## Implementation boundary
The Cameras view now includes a manually acknowledged, browser-local verification checklist. Existing RTSP source configuration, encrypted persistence, one-camera probe, private go2rtc viewer, and disabled-on-discovery registration remain unchanged. No automatic camera activation, ONVIF write, network-wide scan, restarts, MQTT publication, Home Assistant command, Frigate write, or recording is introduced.

## Acceptance procedure
1. Back up local configuration first. Confirm Home Assistant and MQTT are Ready and note their statuses without restarting them.
2. Open Cameras in the *installed Windows Hub*. Check registered camera identity and that any new Build 070 entry remains disabled until expressly approved.
3. Check go2rtc health and ensure both the API and RTSP listeners are loopback-only; do not expose camera services on a public IP.
4. For a recognized camera, obtain its correct RTSP or RTSPS URL from its own manufacturer settings. Enter it via the password-protected camera field; it must be encrypted in the local Hub and not redisplayed.
5. Explicitly enable only the approved registry entry, run its individual stream probe, then observe *moving video* inside the local viewer. A connected go2rtc API, an HTTP response, or a nonzero producer count does not by itself prove visible video.
6. Refresh the browser and verify the same approved feed again. Confirm the UI does not duplicate configuration or alter unrelated cameras.
7. Open the Build 071 checklist. Tick only facts independently verified. The checklist is transient per browser mount, does not store secrets and does **not** create durable audit evidence.
8. Recheck Home Assistant/MQTT. If physical video is unavailable, record this as **field acceptance pending**, not as a test pass.

## Release distinction
GitHub CI may be GREEN for web/API/docs/Windows jobs. It cannot inspect home-network cameras, confirm a playable RTSP feed, or prove local installation. Report repository promotion separately from Windows installation and household stream acceptance.

## Follow-up
A future build can introduce server-backed per-camera verified-frame evidence with opt-in retention limits and expiry. Do not infer this from current producer-count probes.
