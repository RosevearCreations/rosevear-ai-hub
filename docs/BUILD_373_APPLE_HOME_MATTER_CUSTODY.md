# Build 373 — Apple Home, HomeKit and Matter bridging (read-only foundation)

Source implemented; original-home field acceptance HOLD. This is NOT an Apple Home login, Matter commissioner, Apple HomeKit pairing bridge or Thread border router. Never automate high-risk workshop or life-safety devices.

## What ships

- Owner-only Home Assistant device/entity registry inspection. Matches exact HA device IDs with first-party provider markers matter, homekit_controller and homekit; names alone are not evidence.
- Bounded and validated registry readback; duplicate names are warned, never merged. No unsafe raw integration identifiers (which may contain commissioning secrets) go to browsers.
- Local owner review and revocation of a HA identity. Reviews have revision conflict protection, audit records and no actual provider write or unpairing. Local revoke does not remove a device from HA/Apple.
- Responsive owner panel in Home Assistant; source status vs field status explicitly separated. Unknown Apple Home visibility, bridge pairing, Matter commissioning and iOS permissions remain HOLD.
- Safe additive 0034 database migration from 0033. Downgrade removes only local review records; back up first.
- Synthetic test coverage of owner-only authorization, offline/readback failure, duplicate identity rejection, no secrets, review/rollback and optimistic concurrency.

## Supervised field acceptance later

1. Verify original Windows Hub installation, Home Assistant version and administrator-scoped connection. Install 0034 only with a verified database backup and a reversible stop/migrate/start.
2. In HA Settings > Devices & Services, review installed Matter, HomeKit Device and HomeKit Bridge integrations. Review whether each is appropriate for the real installed controller; a HA device registry does not enumerate all bridges.
3. On an Apple device, verify owner-authorized Home pairing and iOS local-network permissions. If Matter-over-Thread is used, separately inspect compatible Thread border router and commissioned fabric. Do not record or paste any setup/PIN codes into the Hub or GitHub.
4. Run Hub > Home Assistant > Private Apple/Matter inventory, Inspect HA registry. Compare actual HA device ID, room, provider and duplicates to physical inventory. Locally review only identities we have witnessed.
5. Verify Apple Home visibility and removal independently with owner present. For revocation, use Apple Home and HA official unpair/remove controls, then revoke local review and re-inspect. Hub cannot revoke pairing.
6. Confirm no cross-tenant/customer information, no provider writes and that a Home Assistant outage produces HOLD.

## Why Apple pairing remains on HOLD

HomeKit Bridge exports HA devices to Apple Home; HomeKit Device imports devices to HA. These are not equivalent. Matter in HA uses a separate controller and compatible devices; unsupported hardware cannot be magically paired. This release reads HA's ordinary registry only and deliberately does not access Apple's private credentials, QR setup codes, cloud account or Thread/Matter fabric.

References:
- https://www.home-assistant.io/integrations/homekit/
- https://www.home-assistant.io/integrations/homekit_controller/
- https://www.home-assistant.io/integrations/matter
- https://developers.home-assistant.io/docs/api/websocket
