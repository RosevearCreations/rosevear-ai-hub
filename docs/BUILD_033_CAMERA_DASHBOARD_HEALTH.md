# Build 033 — Camera Dashboard and Health

## Status

Implementation complete on dev; promotion evidence is recorded in BUILD_STATUS.

## Scope

Build 033 turns the Build 031/032 camera foundation into an operator-facing local dashboard.

- multi-camera dashboard summary
- total / enabled / configured / healthy / attention counters
- per-camera health classification and freshness
- Owner/Administrator fleet health refresh
- stale-health threshold with safe local default
- loopback-only go2rtc live-view URLs using stable non-secret stream names
- embedded local live camera tiles
- dashboard metadata auto-refresh without automatic active probing
- existing per-camera ONVIF and encrypted RTSP administration retained below the dashboard
- dashboard/health audit evidence
- Tauri CSP expansion limited to the fixed local go2rtc listener
- responsive dashboard styling and contextual help

## Health states

Build 033 reports:

- disabled
- unconfigured
- untested
- healthy
- stale
- unavailable
- failed
- no_producer

A prior successful probe becomes stale after CAMERA_HEALTH_STALE_SECONDS. The default is 300
seconds and the accepted range is 30–86400 seconds.

## Live-view boundary

The browser never receives a camera source URL or camera credentials. It receives only a local
viewer URL derived from the already validated loopback GO2RTC_BASE_URL and the stable stream name.

The desktop CSP permits only the fixed local go2rtc endpoint at 127.0.0.1:1984 for camera
frame/media/connect traffic. Build 033 does not authorize arbitrary external frames.

## Active vs passive health

Dashboard metadata polling is passive. It reads previously recorded health state and does not
decrypt source URLs or connect to cameras.

Owner/Administrator **Run health checks** is active. It rehydrates each enabled configured stream
into local go2rtc runtime memory, probes for an active producer, updates last-probe fields, and
records sanitized aggregate audit evidence.

## Non-scope

Build 033 does not:

- add Frigate
- persist video recordings or snapshots
- add object/person/motion analytics
- add PTZ or talkback
- reboot or reconfigure cameras
- expose camera/go2rtc services publicly
- add remote access

Frigate integration begins in Build 034.

## Schema impact

No new migration is required. Build 033 reuses Build 031 cameras and Build 032 camera_streams,
including existing last-probe status/timestamp/error fields.

## Operator setup

No new account, secret, application, or paid service is required.

Real live tiles still depend on the Build 032 local go2rtc installation and configured RTSP sources.
After deployment, open Cameras, run health checks, and verify configured healthy cameras render in
the local dashboard.

## Rollback

Deploy Build 032. No downgrade is required because Build 033 adds no schema. Existing camera
registry entries, encrypted RTSP sources, and probe history remain compatible.
