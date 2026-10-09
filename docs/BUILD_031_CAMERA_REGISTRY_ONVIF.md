# Build 031 — Camera Registry and ONVIF Discovery

## Status

Implementation complete on dev; promotion evidence is recorded in BUILD_STATUS.

## Scope

Build 031 establishes the first camera integration boundary without introducing video transport or
camera control.

- persistent local camera registry
- bounded ONVIF WS-Discovery probe over the trusted LAN
- normalized endpoint UUID, device-service URL, host/port, types, scopes, display name, and last-seen timestamp
- local/private-address filtering for discovered ONVIF XAddr values
- Owner/Administrator discovery and registry enable/disable administration
- authenticated household/read-only registry viewing
- camera discovery/update audit evidence
- Cameras primary navigation surface
- contextual circled-i help for Cameras
- reversible Alembic revision 0015

## Non-scope

Build 031 does not:
- request or store camera usernames/passwords
- open RTSP streams
- proxy video
- perform PTZ, reboot, firmware, or other device-control actions
- create public camera endpoints
- integrate go2rtc or Frigate

RTSP/go2rtc transport begins in Build 032.

## Security boundary

Discovery accepts only HTTP/HTTPS device-service XAddr values whose host is a literal private,
link-local, or loopback IP address. Public IPs and hostnames are not persisted from discovery
responses. Discovery is Owner/Administrator-only and emits one bounded WS-Discovery Probe to the
standard multicast endpoint. Camera metadata remains untrusted input.

## Migration

Alembic revision 0015 creates the cameras table and is reversible to 0014.

## Operator setup

No credential or cloud account is required. To discover real ONVIF cameras:
1. keep the Hub and cameras on a trusted reachable LAN/VLAN
2. permit local WS-Discovery multicast/UDP 3702 where the host firewall and network policy require it
3. sign in as Owner or Administrator
4. open Cameras and choose Scan local network
5. review the discovered registry entries before enabling later streaming work

Some vendor cameras require an explicit setting in their own app/web UI to enable ONVIF. Do not
factory-reset or expose a camera publicly just to make discovery work.

## Rollback

Stop the Hub, run alembic downgrade 0014, then deploy the previous verified release. Downgrading
removes only the Build 031 camera registry table; it does not change camera devices.
