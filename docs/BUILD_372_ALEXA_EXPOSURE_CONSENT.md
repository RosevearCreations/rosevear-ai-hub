# Build 372 — Alexa consent-gated discovery and Home Assistant exposure readback

**Source acceptance:** code, tests and protected GitHub CI only.
**Field acceptance:** HOLD until an owner provides an actual Home Assistant admin integration and Alexa skill, independently verifies real exposure/unexposure and a live voice invocation.
**Authority boundary:** Home Assistant manages actual Alexa exposure and discovery; the Hub stores **reviewed intent only**. No Amazon auth, speaker microphone, Alexa transcript, device actuation or Home Assistant write is performed by this build.

## What Build 372 implements

1. Owner-only `/api/v1/alexa-consent-372/report`: stored local 30-day intent, expiry, revision and honest uninspected status.
2. Owner-triggered `/inspect`: Home Assistant's authenticated WebSocket `config/entity_registry/list` plus `homeassistant/expose_entity/list` and `homeassistant/expose_new_entities/get` for `cloud.alexa`; no implicit polling. Returns reviewed drift, unsafe exposes, exposed-but-absent references, current HA default auto-expose setting, last check time and account-link unverified.
3. `PUT /review`: only the owner may explicitly approve an existing, non-hidden, non-disabled low-risk light entity; no switches, doors, alarms, locks, covers, scenes, scripts, workshop equipment or broad auto-adoption. The response always states no provider mutation and a manual HA step remains.
4. Local revocation works even during HA outage but **does not revoke Amazon/HA access**. The dashboard warns to unexpose in HA; do not claim provider revocation until observed.
5. Owner-only audit of local review decisions (not actual voice commands). The consent review has optimistic revision protection and 30-day expiry. Default deny at Hub level; if HA is inaccessible, inspection fails closed and does not falsely report unexposed.
6. Home page includes searchable exposed/unapproved, consented and eligible views with explicit status. No passwords, voice recordings or cloud credentials stored.

## First genuine activation, supervised by owner

1. On the existing Home Assistant server, verify its admin account and current version. Connect Home Assistant Cloud using the official Nabu Casa instructions if the owner chooses a paid subscription. The alternative manual AWS/Alexa Skill route adds public-HTTPS and Amazon developer requirements and is **not activated** by this build.
2. Go to **Home Assistant → Settings → Voice assistants → Alexa**, confirm **Expose new entities = OFF**, and review any devices already exposed, especially workshop machinery, doors, alarms, locks and security/life-safety entities. This is important because existing exposures may persist even when automatic exposure is disabled.
3. Open AI Hub → Home Assistant → **Alexa exposure review**, press **Inspect HA settings**. This requires a valid HA admin token and authenticated live WebSocket access. HA returns the settings it knows; the Hub cannot prove an Amazon account is linked.
4. Approve only clearly identified, low-risk lights inside the Hub. A local approval lasts 30 days but cannot itself expose the light. Confirm the exact same light in HA's Alexa **Expose** tab, not in a general-purpose script or service.
5. Activate the official Home Assistant smart-home Alexa skill in the Alexa app using the account chosen by the owner. Make a supervised low-risk test (e.g., kitchen light); independently verify HA state changes and speaker response. Record field proof outside the Hub without voice recordings. Source CI does not prove this occurred.
6. Reinspect from the Hub. A provider-exposed entity without effective local approval is a **drift alert**, not automatically deleted. To stop it, manually **Unexpose** within HA. Reinspect and verify disappearance. For offline or cloud loss, show stale/unknown and never claim active voice access.
7. For reversal, revoke the local Hub consent, unexpose the same entity in Home Assistant, and if desired unlink the Home Assistant skill inside Alexa. Review existing stale entities and references separately.

## Security and limitations

- Only the exact `light.<safe_id>` domain is eligible for approval; entities with dangerous machine, lock, alarm, fire, heat or workshop names or devices are withheld. A light with ambiguous classification is *not* automatically safe.
- HA actual exposed state may differ from the local Hub allowlist. This build deliberately **does not enforce** Hub consent inside Amazon/HA. Other Home Assistant integrations or users can change exposures; authoritative revocation remains in HA/Alexa until a future separately approved implementation.
- The official HA exposure list may omit default-exposed entities until a voice assistant first checks an entity. The default-discovery flag is shown separately; source readback does not prove Amazon service account linkage.
- HA user permission for exposure readback is admin. If the existing Hub token lacks that permission, inspection shows HOLD instead of broadening credentials.
- Voice audits in this build mean **owner review decisions**. Real spoken-command auditing would require a separately authorized supported Alexa Devices integration, data minimization and consent.
- Never expose physical workshop machines, automation scripts that operate them, security controls or life-safety systems.
- No customer/business records, recordings or master-sourced credentials enter this local registry.
- Migration 0033 creates only a new `alexa_consents372` table. No existing device/HA exposure setting is changed. Rollback removes this local table only after preserving its audited decisions.

## Acceptance suite

Synthetic regression: unauthenticated and non-owner denied; owner confirmation required; disallowed machine/light name, hidden light, switch, absent HA entity blocked; concurrent revision rejected; expired/revoked consent denied; unexpected provider exposure flagged; automatic discovery warning; HA outage does not destroy local history or claim real unexposure; WebSocket executes only the two documented **read** commands. Actual Amazon and physical-device acceptance remains HOLD.

## Sources

- Home Assistant Alexa: https://www.home-assistant.io/integrations/alexa
- Home Assistant voice exposure and defaults: https://www.home-assistant.io/voice_control/voice_remote_expose_devices
- Official HA WebSocket exposure management: https://developers.home-assistant.io/docs/api/websocket
- Nabu Casa Alexa integration: https://support.nabucasa.com/hc/en-us/articles/25619363899677-Configuring-Amazon-Alexa-to-work-with-Home-Assistant
- Owner's Three Master Application Review, Nov 20, 2026, pp. 5, 6 and 9: source/field readiness and scope.
