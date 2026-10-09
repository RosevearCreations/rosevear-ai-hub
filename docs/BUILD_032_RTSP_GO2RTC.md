# Build 032 — RTSP / go2rtc Integration

## Status

Implementation complete on dev; promotion evidence is recorded in BUILD_STATUS.

## Scope

Build 032 adds the first local camera-stream transport layer on top of the Build 031 camera registry.

- loopback-only go2rtc HTTP API adapter
- local go2rtc status/version/listener visibility
- encrypted private-LAN RTSP/RTSPS source storage
- one stable go2rtc stream name per camera
- credentials are never returned by the Hub after save
- go2rtc receives credential-bearing source URLs only through runtime PATCH
- Hub-managed camera streams are created through runtime-only PATCH and are not persisted into go2rtc YAML
- private/literal source-IP validation before encryption or transport
- Owner/Administrator stream configuration, deletion, probe, and reconcile actions
- best-effort automatic stream rehydration when the Hub starts and local go2rtc is available
- authenticated read-only stream metadata for lower roles
- local relay endpoint metadata
- camera stream transport audit evidence
- reversible Alembic revision 0016
- Windows go2rtc startup helper and local-only config template

## Non-scope

Build 032 does not:
- create the multi-camera live dashboard
- proxy browser video through FastAPI
- add Frigate
- add PTZ, talkback, camera reboot, firmware, or other device writes
- expose go2rtc, RTSP, WebRTC, or camera services publicly
- discover vendor-specific RTSP paths automatically
- weaken the camera private-network requirement

Camera dashboard and health work begins in Build 033.

## Security boundary

The Hub accepts go2rtc only through an HTTP base URL on localhost/loopback. The supplied go2rtc
template binds its API, RTSP listener, and WebRTC listener to loopback addresses.

RTSP source configuration must:
- use rtsp:// or rtsps://
- use a literal private, link-local, or loopback IP address
- stay within the configured 4096-character bound
- contain no CR/LF injection characters

Credential-bearing RTSP source URLs are encrypted with the existing Hub master encryption key.
Only sanitized scheme/host/port/credential-present metadata is persisted in cleartext. The source
URL is not returned through the API or UI after save. The existing master-key rewrap operation also
rewraps camera stream source ciphertext before the previous key is removed.

Hub-managed stream creation uses go2rtc runtime PATCH directly. Neither the stream entry nor its
credential-bearing source is persisted into go2rtc.yaml, so the YAML file does not become a second
camera credential store.

## Migration

Alembic revision 0016 creates camera_streams and is reversible to 0015.

## Operator setup

A real camera stream requires the official go2rtc Windows binary:

1. download the official go2rtc Windows executable from the upstream project
2. place it at tools\go2rtc\go2rtc.exe inside the Hub repository
3. keep SECRET_ENCRYPTION_KEY configured on the Hub machine
4. run scripts\start-go2rtc.ps1 once, or start the Hub with scripts\dev-desktop.ps1
5. open Cameras and confirm go2rtc reports Online
6. confirm API local-only = Yes and RTSP local-only = Yes
7. select a camera, enter its private-LAN RTSP URL once, and save it
8. use Test RTSP stream to verify the source
9. a full Hub restart rehydrates enabled streams automatically; after a go2rtc-only restart while the Hub stays running, use Sync go2rtc

No cloud account, OAuth application, API key, or paid service is required.

## Rollback

Stop the Hub and go2rtc, downgrade Alembic to 0015, and deploy the prior verified release.
Downgrading removes only camera stream transport configuration. It does not alter the physical
camera or the Build 031 camera registry.
