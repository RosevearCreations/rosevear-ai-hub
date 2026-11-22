# Build 375 — Camera, doorbell and event reliability

**Source implementation ready for protected acceptance; original-host and
physical camera/doorbell acceptance remain FIELD_HOLD.**

## Existing capability retained

Build 031 ONVIF source discovery; encrypted RTSP; go2rtc probes and private
camera wall; Build 034 local Frigate camera/event reader; existing event
review ledger and privacy-gated CSV; camera compatibility and field playback
workbench. No replacement of those functions. No webhooks, configuration
changes or streaming/recording duplication.

## New material delivery

1. Owner-only, deliberate private reliability inspection combines the current
   ONVIF camera registry/probe history with local go2rtc availability and
   loopback Frigate version/config/recent-event readbacks.
2. Independent statuses prevent treating a reachable go2rtc listener, a
   producer count, a Frigate event, a video-thumbnail flag, or a past
   successful reading as proof of moving picture, audio, doorbell chime,
   stored media playback or any camera's true physical availability.
3. Event metadata is bounded to 100. It quarantines duplicate event IDs,
   future-dated entries, invalid durations and unknown camera sources.
   A lack of events never certifies an offline camera: it may be a quiet
   scene or detection-disabled configuration.
4. Disabled Frigate detection, disabled source, event endpoint outage and
   camera transport outage remain distinguishable and independently
   reportable; one failure cannot turn an unknown reading into zero events.
5. Audited owner-approved local binding maps a registered ONVIF camera
   identity to a live Frigate name, optionally tagged "doorbell candidate".
   Revision guard, source recheck, conflict protection and offline
   deactivation. No vendor pairing, unpairing or doorbell actuation.
6. Bounded last-20 local metadata receipts with no IP addresses, source URLs,
   credentials, event IDs, clips or photographs. Historical receipts age
   into a STALE state after 10 minutes. No autonomous polling or alert flood.
7. Responsive owner panel in existing Cameras view, addition-only database
   migration 0036 and synthetic authorization/offline/cross-provider tests.

## Supervised acceptance later

- Verify actual Windows Hub installation and independently restorable
  private backup. Stop Hub, migrate 0036, restart, and verify a clean
  release-adoption receipt before testing the new source screen.
- With an owner present, enroll real ONVIF/RTSP sources and physically
  verify moving video, clip playback, audio, event delivery under real motion,
  doorbell chime and privacy permissions separately. RTSP credentials must
  remain in encrypted local storage. Do not connect manufacturer cloud
  services unless separately approved and supported.
- Compare Frigate camera names with registered ONVIF entries, approve exact
  mappings only, and mark doorbell role as candidate until chime/media
  and owner device authority are verified.
- Test Frigate down, go2rtc down, disabled detect, quiet periods, time-skew,
  duplicate metadata, failed media and camera offline independently.
- No claim that Ring, Nest or other vendor-only doorbells support RTSP/ONVIF.
  Hardware-dependent integrations require explicit supported API review.

## References
- https://docs.frigate.video/integrations/api/
- https://docs.frigate.video/configuration/cameras/
- https://github.com/AlexxIT/go2rtc
- https://www.onvif.org/profiles/
