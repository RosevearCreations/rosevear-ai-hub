# Build 070 — Camera Inventory Discovery & Safe Registration Acceptance

## Why
The household Chrome Hub was restored, with Home Assistant and MQTT both Ready,
but **zero Hub camera registrations**. go2rtc and the optional Frigate adapter
are different services; neither proves ONVIF camera registration. The existing
Scan local network action previously **wrote directly to the camera registry**
without a chance to review discoveries.

## Scope and behavior
1. **Cameras → Review local cameras** is owner/administrator-only and sends an
   explicit ONVIF WS-Discovery request to the existing trusted LAN with an
   existing bounded 2.5-second probe. The new endpoint writes no DB records.
2. Only candidates with a matching private IP / local service host and
   HTTP(S) ONVIF service URLs without embedded credentials, query strings
   or fragments are admitted to a bounded list (maximum 32).
3. The server issues a one-time, owner-bound preview ticket, held **in
   process memory for at most five minutes**. It expires on backend restart,
   cannot be reused, cannot be submitted by another account and cannot
   authorize unscanned endpoint UUIDs.
4. The operator reviews candidates, skips existing registry entries and
   **manually checks specific camera boxes**. Nothing is registered until
   the operator clicks **Register selected cameras disabled**.
5. On acceptance, only selected **new** camera UUIDs are inserted and
   **disabled by default**. Existing camera names, IPs, enabled settings,
   encrypted RTSP credentials and stream configurations are preserved.
   No go2rtc updates, Frigate writes, recordings, PTZ, talkback or
   MQTT publications occur. Registration is audited.
6. If the LAN scan finds nothing, the UI explains that absent ONVIF discovery
   is **not proof physical cameras are disconnected**. No automatic subnet
   scanning, IP brute-forcing, credential discovery or internet discovery.
7. The old POST /api/v1/cameras/discover remains for API compatibility, but
   the main Windows/web client no longer invokes the implicit-write flow.

## Operator acceptance — after locally installing code
- Keep the Windows Hub, Home Assistant, MQTT broker and browser running.
- In Chrome open Cameras. Confirm current camera inventory count before scan.
- Click **Review local cameras**. If no candidates, report that precisely;
  do not interpret it as a video transport or network failure. ONVIF may
  be off, unsupported or blocked by multicast isolation.
- If you recognize a discovered device, select **only** that device.
  Confirm the UI explicitly says it will register **disabled**.
- Click **Register selected cameras disabled** once. Confirm the registry
  grows by exactly the approved count and new entries remain disabled.
  Existing streams/settings must remain unchanged.
- Separately, after approval and account/network verification, enable
  a camera and configure encrypted RTSP in the pre-existing camera editor.
  Build 070 itself does not activate streams.
- If Frigate is offline or 0 cameras are registered, treat that as an
  independent status. Do not install Frigate or expose ports publicly.

## Release acceptance vs actual installation
GitHub backend/web/docs/Windows checks must all pass on `dev`, PR and
the independent post-merge `main` commit. Production GREEN means
**repository build/CI GREEN**, not that the private Windows machine has
been updated, nor that cameras have been discovered or physically tested.
The existing online Hub, Home Assistant and MQTT must not be restarted
to perform GitHub build/CI promotion.

Next queued: **Build 071 — Camera Transport Configuration & Verified Stream Acceptance**.
