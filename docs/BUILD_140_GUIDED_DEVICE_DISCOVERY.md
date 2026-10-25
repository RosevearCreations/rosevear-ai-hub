# Build 140 — Guided Device Discovery Inbox & Owner-Safe Adoption

## Scope and operator workflow

The Home Assistant / Devices view contains a **Guided device discovery inbox** above Device 360. Opening the page does **not** issue any source reads or ONVIF scans for this inbox. An authenticated Owner/Administrator deliberately selects **Start source inventory review** to read existing Home Assistant devices/entities, owner-reviewed MQTT topic references, the camera registry, and the local decision ledger. Each source has its own availability status; an unreachable provider is **unknown**, not an empty or broken house. Each candidate retains its exact source ID, room provenance, confidence and non-binding duplicate warnings.

Owners select **one exact candidate**, acknowledge source-ID review, then choose **Approve for follow-up**, **Reject candidate**, **Unsupported** or **Investigate**. These are versioned, audited **local review decisions**, not actual Home Assistant/MQTT pairing, subscription, publishing, control or identity merge. Reviews require a source observation no more than five minutes old, the expected stored revision and an independent explicit acknowledgement. A repeated identical decision on the same observation fails closed. Stored source reviews remain distinct from Device 360 registry annotations and from HA/Camera provider identities.

ONVIF is a **second opt-in action**: select **Scan ONVIF cameras (opt-in)** to invoke the existing bounded preview API. After an exact *new* camera UUID and any conflicting endpoint warnings have been reviewed, save **Approve for follow-up**, then independently acknowledge **Register one reviewed camera disabled**. The existing backend one-use short-lived preview ticket is submitted only for that one UUID. The UI refreshes current camera IDs before acceptance; exact UUIDs, registered candidates and conflicting host/port mappings are held. The registration API remains the authoritative collision/role gate and creates disabled cameras, without starting a stream. Repeat or expired ticket attempts must rescan.

Home Assistant devices are adopted **only** through an independently authorized supported integration in Home Assistant's Devices & Services. MQTT candidates are **only** manually reviewed topic references; no broker scan, subscription, wildcard discovery, retained-body read or new command path was added. Legacy X10 hardware may require a supported bridge configured independently in HA; there is **no direct X10-to-Meross integration**.

## Security and data contracts

- `GET /api/v1/device-discovery/reviews`: authorized signed-in household users may inspect source review decisions.
- `PUT /api/v1/device-discovery/review`: owner/admin only; allowed source types (`ha_device`, `ha_entity`, `mqtt`, `camera_candidate`), exact non-secret source ID, one of four decisions, observation timestamp and optimistic expected revision. Rejects stale/future observations, MQTT wildcards, URL- or secret-bearing source IDs and unchanged-decision replays. Audit records source *type*, disposition and revision, not exact hardware IDs.
- Migration `0024_guided_device_discovery` creates only `device_discovery_reviews` with a unique source + source ID; rollback removes only this new table, not camera, Device 360, HA or MQTT data.
- Existing Home Assistant control allowlist, camera acceptance ticket and disabled-first policy, MQTT authorization boundary and vault security posture are unchanged. Never print private camera IPs, service URLs, ticket contents, MQTT secrets or provider tokens in cards, alerts or audit records.
- The UI does not poll automatically; navigation and read-only accounts cannot start a new scan. A client-side abort, rejection, timeout or integration unavailability never triggers a background enrollment.

## Acceptance / operator verification

Automated tests cover (1) zero requests on inbox mount; (2) the separate deliberate source read and ONVIF preview; (3) explicit one-candidate reviews and roles; (4) duplicate camera UUID/endpoint holds; (5) required independent camera acceptance, single ticket handoff, disabled-first result; (6) source separation, confidence, sanitization and observation expiry; (7) revision/replay/stale/secret rejection, audit safety and additive migration reversal. Run Python backend checks, web typecheck/Vitest/build, docs/platform jobs on both `dev` and `main`.

**Production GREEN** is the GitHub source/CI state only. On the Windows PC, an Owner must update the local server separately and personally verify Home Assistant inventory, actual camera discovery on the private LAN, disabled camera registration, broker read-only behavior and real device availability. No installation, physical function, remote Windows task edits or password vault enablement is implied. Vault remains **0 / 6 verified — HARD SECURITY HOLD**.

## Next queued builds

141 Camera Wall V2; 142 Camera Events & Evidence; 143 MQTT Topic Explorer; 144 HA Scenes & Safe Action Drafts; 145 Workshop Equipment 360; 146 Windows Recovery Console; 147 Responsive Command Shell & Help Polish.
