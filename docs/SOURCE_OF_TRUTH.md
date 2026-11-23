# Rosevear AI Hub — Source of Truth

**Document status:** Canonical  
**Established:** 2026-10-02  
**Applies to:** All implementation, testing, release, security, automation, and integration work.

## 1. Product statement

Rosevear AI Hub is a self-hosted, local-first AI application that provides one unified interface for:

- local and optional cloud AI
- private household and workshop knowledge
- manuals and project documents
- Home Assistant devices and sensors
- MQTT devices
- compatible security cameras
- notifications and deterministic automations
- Devil n Dove
- Rosie Dazzlers
- YW
- future household and business integrations

The Hub must remain useful if any individual AI provider, smart-home vendor, camera vendor, or business application changes or disappears.

## 2. Why this exists

We currently use multiple independent ecosystems for smart-home devices, cameras, business systems, documents, and AI. The Hub provides a stable layer we control.

It should reduce:
- duplicated vendor apps
- unnecessary subscriptions
- repeated manual lookups
- cloud dependence
- vendor lock-in
- fragmented household automation

It should increase:
- local control
- privacy
- resilience
- traceability
- accessibility
- reusable business knowledge
- safe automation

## 3. Non-goals

The Hub will not initially:
- replace Home Assistant as the smart-device integration platform
- replace Frigate or another NVR as the authoritative video recorder
- replace Devil n Dove, Rosie Dazzlers, or YW as systems of record
- directly expose internal services to the public internet
- autonomously operate dangerous workshop machinery
- autonomously disarm security systems
- autonomously unlock exterior doors
- disable smoke/CO/life-safety devices
- make purchases without explicit approval
- publish public-facing content without an approval workflow

## 4. Users and roles

### Owner / Administrator
Can:
- configure integrations
- manage users
- manage model providers
- manage secrets
- inspect logs
- approve or deny high-risk actions
- edit automation rules
- perform backups and restores

### Household User
Can:
- chat
- search approved knowledge collections
- inspect device state
- perform explicitly allowed low-risk actions
- use approved automations

### Read-only User
Can:
- ask questions
- view dashboards
- view approved sensors/cameras
- not change physical or business state

Future roles may include business-specific users.

## 5. Primary experiences

### Chat
Unified assistant with:
- streaming responses
- provider/model selection
- citations
- conversation history
- tool execution
- permission-aware actions

### Knowledge
- upload documents
- classify into collections
- index locally
- semantic + keyword retrieval
- citations
- duplicate detection
- re-indexing
- delete/export

### Home
- rooms/areas
- entity status
- scenes
- low-risk controls
- automation visibility
- device health

### Cameras
- registry
- online/offline status
- live view where supported
- event links
- recording status
- snapshots
- integration health

### Workshop
- manuals
- environmental sensors
- equipment metadata
- maintenance notes
- safe notification rules

### Business
Read-first connectors to:
- Devil n Dove
- Rosie Dazzlers
- YW

Writes must be introduced one narrow workflow at a time.

### Automations
Human-readable:
- triggers
- conditions
- actions
- run history
- disable switch
- error state
- audit evidence

## 6. AI model policy

The model layer must be provider-neutral.

Initial provider:
- Ollama

Optional future providers:
- OpenAI
- other cloud/local providers

Routing may consider:
- privacy sensitivity
- capability
- latency
- cost
- availability
- user preference

Private household documents should default to local processing unless explicitly configured otherwise.

## 7. Tool permission policy

Every action belongs to one risk class.

### Level 0 — Read
Examples:
- search documents
- read sensor state
- inspect inventory
- inspect camera health

May execute automatically.

### Level 1 — Low-risk action
Examples:
- turn a light on/off
- activate a non-safety scene
- send a household notification

May be user-configured for direct execution.

### Level 2 — Confirmation required
Examples:
- edit business records
- delete files
- send external messages
- change automations
- restart services
- publish content

Must display the exact intended action before execution.

### Level 3 — Prohibited autonomous action
Examples:
- unlock exterior doors
- disarm security
- disable smoke/CO alarms
- operate forge/kiln/laser/CNC or comparable hazardous equipment
- make purchases
- bypass security controls

These actions are never freely delegated to an LLM.

## 8. Automation policy

AI may help draft automations, but deterministic code executes them.

Canonical flow:

```text
User request
  -> AI proposes structured rule
  -> Server validates schema and permissions
  -> Human reviews
  -> Rule saved
  -> Event engine executes
  -> Audit log records result
```

Important automations must not depend on an LLM being online.

## 9. Sources of truth

- Home Assistant: current integrated IoT entity state
- Camera/NVR platform: recordings and video events
- Devil n Dove: Devil n Dove operational/business data
- Rosie Dazzlers: Rosie Dazzlers operational/business data
- YW: YW operational/business data
- Rosevear AI Hub: users, permissions, conversations, knowledge index, automation definitions, integrations, model profiles, audit records

The Hub must not silently create shadow copies of business records as new authorities.

## 10. Privacy requirements

The Hub must:
- use localhost/trusted LAN binding by default
- keep secrets outside source control
- encrypt sensitive persisted tokens where practical
- never log raw passwords
- redact tokens from logs
- provide local-only knowledge collections
- make cloud-model use visible
- support data export/deletion
- maintain an audit trail for state-changing actions

## 11. Reliability requirements

### Ollama unavailable
- show offline state
- preserve history
- keep non-AI dashboards operational

### Home Assistant unavailable
- show stale state with timestamp
- block writes
- keep chat/knowledge operational

### Internet unavailable
Where technically possible, local AI, local knowledge, Home Assistant, MQTT, and local camera functions should continue.

## 12. Accessibility and usability

The Hub should favor:
- large readable controls
- keyboard navigation
- clear error messages
- high-contrast states
- minimal repetitive steps
- voice interaction later
- useful operation from desktop and tablet

## 13. Definition of done

A build is complete only when:
1. code is committed
2. automated tests pass
3. docs are updated
4. migrations are safe/reversible or backed up
5. security implications are reviewed
6. user-facing behavior is verified
7. rollback instructions exist where relevant
8. no known critical regression remains

## 14. Change control

Major architecture changes require an ADR.

Examples:
- replacing SQLite
- changing auth/session architecture
- replacing Home Assistant as IoT layer
- changing the model/tool orchestration model
- enabling remote access
- allowing new autonomous writes
- changing the release model

## 15. Guiding test

When considering a feature, ask:

> Does this make the Hub more useful, private, safe, understandable, and replaceable—or does it create another vendor lock-in or hidden dependency?

Prefer the former.

## 16. 2026 household network expansion — owner-directed

Rosevear AI Hub must **prioritize useful household and workshop operations**, rather than allowing repeated Master evidence panels to crowd out day-to-day Home, Devices, Cameras, Workshop, Automations, Network and System screens.

A common permissioned **device and source identity graph** should connect relevant screens without exposing unrelated business/household data or issuing universal network commands. Each inventory item needs a verified source (Home Assistant, MQTT, owner-approved vendor adapter, camera registry or explicit manual entry), last-seen/freshness, compatibility, room/workspace, availability and permission class. Missing devices must be explicitly displayed as **unidentified, missing, offline, unsupported or not yet enrolled**—never silently marked healthy or guessed. A network map must distinguish registered sources from discovered but unapproved hosts; no surprise LAN scanning.

First-party bridge priorities, subject to actual compatible hardware, firmware, owner consent and provider auth:
- **Home Assistant** is authoritative for household entity/device states, approved scenes and safe automation outcomes.
- **Amazon Alexa**, **Apple Home/HomeKit/Matter**, **Samsung SmartThings**, and supported Zigbee/Z-Wave/Thread/Bluetooth/MQTT integrations have independent scope, opt-in enrollment, source provenance, revocation and offline handling. Do not claim blanket vendor compatibility, hidden account access or cloud independence where it does not exist.
- **Creality printer**, owner-described as "Creality Pro 5" (exact model and firmware must be confirmed), should have read-only process and job monitoring using an actually supported approved interface such as an existing print controller bridge; never send remote heating, movement, start/stop or emergency actions from generic AI.
- **Other workshop machinery** (3D printers, CNC, laser, kiln, forge, casting, ventilation) may expose owner-approved process status, safety alerts, environmental readings and maintenance tasks only; no autonomous hazardous machine control.
- **Network sequencing** may describe the safe startup and dependency relationships of Home Assistant VM, Caddy, MQTT, cameras, Ollama and the AI Hub. Any reboot, firewall, IP/DHCP, DNS, Tailscale or router change remains owner-supervised and reversible.
- **Household grocery board** should track lists, quantities, pantry needs, approved family collaborators and pickup plans. Do not place orders, spend money or share shopping identities without a separate confirmation and provider consent.
- Calendar, chores, user support, helpdesk and incidents should use shared identity and audit patterns without becoming shadow authorities for iCamp, Yard Workers, Rosie or Devil n Dove.

## 17. Completion measurement, backlog and source/field separation

Effective 2026-11-19, use `docs/contracts/hub-feature-progress367.json` as the **new 24-module scoped planning baseline**, not the previous narrower or sample business-category percentages. The original 15 Hub-native categories in the owner Build363 Word review averaged 68%; Build366 targeted 64% under a different narrower scope. Those cannot be directly compared with newly added vendor, network, printer and household features.

For each in-scope module: assign an explicit 0–100 source coverage estimate, reason, applicable source/tests, distinct field-acceptance evidence, owner, blocker and next-build milestone. Overall feature estimate = arithmetic mean of 24 applicable module scores; delegated storefront, payroll, tax, invoices and accounting remain **N/A**, not fabricated zeros. Score field acceptance separately; define the blended planning estimate as 65% source and 35% field. The Build367 expanded 24-module baseline is **41.3%** source, **18%** field and **33.1%** blended. These are management estimates and do not prove device connectivity or independent security review.

Adding a new applicable module must increase the denominator and may reduce completion. Do not advance the score just because a PR merged, a screenshot looks good or a build number changed. Target **5–10 source-feature percentage points per build within identified target modules**, only when enough complete implementation/test scope was delivered. Existing scores may decrease after a feature review discovers broken/unsupported workflows or a requirement is widened; document that transparently.

The next **exactly 20 numbered build proposals are Builds 368–387**, listed with acceptance and safety controls in `docs/BUILD_QUEUE_368_387_HOME_NETWORK_MASTERS.md`. Reconcile this queue and scorecard after each owner-approved build; queue length counts explicit numbered proposals only, not an invented total number of builds to reach 100%.

## 18. Master, Slave Shell and field authority boundaries

Three Masters are **AI Data Platform**, **Rosevear AI Hub** (original Windows runtime) and **Rosevear Comms Hub**. Governed Slave Shells are **YW** and **iCamp**; direct company applications are **Rosie Dazzlers** and **Devil n Dove**. The Hub may independently inspect sanitized aggregate signed sources and persist local read receipts. It must not claim shared runtime or message connection unless a genuine independent signed end-to-end peer delivery/ACK, source identity, TLS transport, replay journal and owner decision have all been independently accepted.

A verified TLS GET, a signed-file sample, a CI-green branch and an actual physical original-host boot are **different** evidence classes. Build367 implements an operator-run private TLS + Ed25519 source receipt and a read-only owner console; it does not enroll other providers, start workers or authorize the Comms QL-340C private receiver. A later explicit original-host ceremony and independent witness are required for receiver and autonomous boot acceptance. Default every unknown permission and runtime state to HOLD.

## 19. Theme, layout, device and accessibility acceptance

All available Master themes must retain readable backgrounds, foregrounds and focus outlines. No stark white Home Operations panel when Dark Mode is selected. Every form should have bounded field widths, sensible labels, date/time pickers, consistent timezones, usable error messages, touch-target sizes, keyboard navigation, zoom, screen-reader semantics and desktop/tablet/mobile acceptance. **Daylight and High Contrast remain independent user-selectable modes.** Cosmetic CI green alone cannot replace actual client/browser review.


## Build 368 — Private network trust and safe identity (source implementation, 2026-11-19)

Build 368 establishes an owner-only manual IPv4 trust/observation registry and independently signed /24–/32 private CIDR approvals. A review signature is checked against a separately provisioned Ed25519 public-key pin. Observations store source IDs, local IP/lease history, collision warnings and audit receipts, but never independently certify device presence, assign an identity to a physical machine, execute a scan, or enable control. No app, private receiver, Windows service, router, Home Assistant, camera or MQTT credential is changed or connected by this GitHub source release.

Source progress is tracked in docs/contracts/hub-feature-progress368.json (security 60%, network discovery/topology 28%, estimated expanded source 41.8%, blended planning 33.5%); original-host runtime acceptance remains a separate HOLD pending field key and device verification. The governed next build is 369 Whole-home Home Assistant inventory reconciliation, with 19 queued builds remaining (369–387). Full operator setup, rollback and checks are in docs/BUILD_368_PRIVATE_NETWORK_TRUST_AND_DEVICE_IDENTITY.md.


## Build 369 — Whole-home Home Assistant inventory reconciliation (2026-11-19)

Owner-triggered read-only Home Assistant area/device/entity registry and state capture, with durable exact source identity history, room and rename differences, registry-only and unavailable status, unclaimed owner reviews, prior-approved MQTT topic notes and incomplete-snapshot HOLD. Device names or unavailability do not authorize physical access, device pairing, or source deletion. No background LAN scan, MQTT read, Home Assistant write or original Windows-host field acceptance is implied. The Source of Truth release assessment is recorded in `docs/contracts/hub-feature-progress369.json` with full field runbook `docs/BUILD_369_HOME_ASSISTANT_INVENTORY_RECONCILIATION.md`. Next proposed Build 370; 18 planned builds remain (370–387).


## Build 370 — Read-only printer-PC observation gateway (2026-11-20)

The local Windows printer PC, not the Creality printer, is the potential network source. New optional one-shot collector enumerates Windows COM interfaces and installed printer queues, adds unverified equipment notes, optionally reads local OctoPrint GET API, and pushes Ed25519 signed private HTTPS receipts to a pinned Hub receiver. Owner-only dashboard shows source identity and staleness; no serial commands, laser operations, USB camera streams, printing, cutting, controller collision or unattended agent installation. Original printer PC and Hub key enrollment remain FIELD_HOLD. Source coverage estimates: docs/contracts/hub-feature-progress370.json; operator runbook: docs/BUILD_370_PRINTER_PC_READ_ONLY_GATEWAY.md. Next Build371, 17 planned builds remaining.

## Build 371 — Supervised printer-PC USB identity and local camera preview (2026-11-20)

Owner-prioritized after Build370: the physical source is a **separate original Windows printer PC**, with an Ender 5 Pro, two Epson devices, Ortur Laser Master 3, scanner, Cricut Maker 3 and two USB cameras. The owner has **no Raspberry Pi and no installed OctoPrint**. New Build371 opt-in tools provide hashed Windows USB PnP registry enumeration, COM port drift comparison across two distinct signed source receipts, owner-only Hold/Source status and a **localhost-only single-camera-at-a-time four-second snapshot viewer**. Neither the Hub nor the collector opens a machine serial port or creates a remote camera stream. Windows PnP enumeration does not prove physical device identity or print job state. Nothing in the GitHub release installs code on the original printer PC or verifies a real source; original-host private TLS/public-key pin, live first/second receipt, actual camera images, WAN recovery and Master ACK remain independently witnessed FIELD_HOLD.

The owner-uploaded `Rosevear_Three_Master_Application_Review(3).pdf` is a **proposed-goal** review, not current runtime evidence. Map each future Master build to what works, gaps and acceptance using `docs/MASTER_RECOMMENDATIONS_2026-11-20_GOAL_REGISTER.md`. Retain boundaries: AIDP fleet statistical quality, Comms private operator incidents, Hub local observations. The original roadmap's Build371 MQTT/bridge goal was displaced by this explicit owner override and remains visible as unscheduled backlog (not implemented). Source score `docs/contracts/hub-feature-progress371.json`, supervised setup and safety runbook `docs/BUILD_371_SUPERVISED_PRINTER_PC_CAMERA_SETUP.md`. Next numbered Build 372 Alexa voice interoperability; 16 numbered builds 372–387 remain, plus the displaced unnumbered MQTT/radio goal.

## Build 372 — Alexa owner-consent and real HA exposure review (2026-11-21)

Build372 adds owner-only, opt-in Home Assistant Alexa exposure readback, an owner-reviewed 30-day local allowlist restricted to unambiguous safe lights, expiry and audit, unexpected exposure and auto-discovery warnings, and explicit field HOLD where Amazon and voice activation cannot be verified. No Amazon login, HA exposure changes, voice recordings, network scan or physical controls are performed by the Hub. Source score: docs/contracts/hub-feature-progress372.json. Operational and rollback guide: docs/BUILD_372_ALEXA_EXPOSURE_CONSENT.md. Next Build373, 15 numbered builds (373–387) plus the still-displaced radio/bridge goal remain.

## Build 373 — Apple Home, HomeKit and Matter HA source reconciliation (2026-11-21)

Owner-only Home Assistant registry provider markers and exact HA device IDs; duplicate name alerts, local audited reviewed/revoked decisions, safe migration 0034 and no pairing credentials or provider writes. No Apple Home export/visibility or Matter commissioning claimed. Real bridge configuration, iOS permissions, Thread border router, independent physical pairing and local Windows installation remain FIELD_HOLD. Source contract docs/contracts/hub-feature-progress373.json; field guide docs/BUILD_373_APPLE_HOME_MATTER_CUSTODY.md. Next Build374 SmartThings; 14 numbered builds (374–387) remain plus displaced original radio/bridge goal.

## Build 374 — Samsung SmartThings read-only cloud inventory (2026-11-21)

Scoped HTTPS GET devices/locations/rooms, owner-gated encrypted short-lived
credential, local deletion and review, exact HA identity vs name-only candidate
reconciliation, stale observation metadata and migration 0035. Live OAuth
installation, developer plan, Android/Tizen access, original-host operation and
physical device acceptance remain FIELD_HOLD. Provider writes remain disabled.
See docs/BUILD_374_SMARTTHINGS_PROVIDER_SCOPE.md and
docs/contracts/hub-feature-progress374.json. Next Build375 cameras/doorbells;
13 numbered proposals (375–387) plus deferred radio/bridge scope remain.

## Build 375 — Camera/doorbell/event reliability source (2026-11-22)

Owner-only readback merges existing go2rtc/ONVIF camera probe status with local
Frigate config/event freshness, quarantines duplicate/future/invalid event metadata,
separates offline vs quiet/no-event, and supports audited local owner identity
mapping (doorbell candidate) and bounded metadata-only history with migration
0036. No raw media, provider write, or automatic event polling. Physical
moving video, clip playback, sound, doorbell chime and original-host install
remain FIELD_HOLD. docs/BUILD_375_CAMERA_EVENT_RELIABILITY.md and
docs/contracts/hub-feature-progress375.json are the source references.
Next Build 376 Safe Automation Sequencing. Builds 376–387 are 12 future
numbered proposals plus the deferred radio/bridge goal.

## Build 376 — Safe automation DAG preview and causal rehearsal (2026-11-22)

Owner-only dependency graph plans with pinned existing rule hashes, exact
review-only approval, invalidation on edits, simulated provider failure,
durable cause replay guard, plan-specific cooldown, local audit and no
device commands. New protected API and private Automations UI; additive
migration 0037. Existing Event Engine untouched. Source report:
docs/BUILD_376_SAFE_AUTOMATION_SEQUENCE.md and
docs/contracts/hub-feature-progress376.json. Live provider execution and
original host field evidence remain HOLD. Runtime events from other apps
are NOT source code or Git branch changes. Next Build 377 Workshop Process
Health Command Centre. Remaining numbered builds 377–387 = 11, plus
displaced radio/bridge task still open.

## Build 377 — Workshop process-health command centre (source, 2026-11-22)

Owner/administrator-only equipment/jobs/maintenance readout and append-only
manual readings with honest freshness, ventilation/fault/maintenance HOLD
reasons. Previously signed Build370 printer-PC metadata is displayed as an
unbound source, not linked by machine name or claimed as live on Ree's host.
Additive migration 0038, isolated audit and zero control path. Source-scoped
24-module estimates are in docs/contracts/hub-feature-progress377.json
(workshop registry 64%, maker monitoring 43%, source overall 47.2%,
field 18%, blended 37.0%). All physical device/source readings, field
installation and real Windows host acceptance remain FIELD_HOLD. See
docs/BUILD_377_WORKSHOP_PROCESS_HEALTH.md. Next Build378 Grocery/Pantry;
ten numbered proposals (378–387) plus displaced radio bridge goal remain.


## Build 378 — Private grocery ordering board and pantry (source, 2026-11-22)

Authenticated shared household Groceries screen and additive database migration
0039. Owner/family users manually record quantities, expiry dates, price notes
and recurring essentials. Owner/administrator approves a precise requested
quantity for manual pickup, not for a purchase or payment. Partial received
quantities update only local pantry data and invalidate previous approval.
Same-name and same-unit duplicates may be owner-merged, preserving history.
Only approved pickup lines print. No retailer, financial, device/sensor,
calendar, notification or external-app action is enabled. Source coverage
assessment: docs/contracts/hub-feature-progress378.json. Original Windows
installation, family RBAC and cross-device print review are FIELD_HOLD.
Operator guide: docs/BUILD_378_GROCERY_PANTRY.md. Next Build379 Family
Calendar, Chores and Reminders; nine numbered builds 379–387 plus deferred
radio-bridge work remain.


## Build 379 — Private Family Calendar, Chores and Reminders (source, 2026-11-22)

Authenticated Calendar month/worklist view with household/private entry roles,
named Ontario/Canada IANA time zones and explicit DST gap/fold rejection,
household notes and supplies, actor-scoped task assignment, recurring completion,
overdue detection, in-app reminder acknowledgment (revision and replay guarded)
and append-only private activity receipts. Data migration 0040 and Windows
tzdata dependency. No timed external notifications, cloud calendar, messages,
devices, retailer orders or cross-app writes. Source module estimate in
docs/contracts/hub-feature-progress379.json. Original Windows migration,
Firefox/mobile field checks and family role acceptance remain FIELD_HOLD.
See docs/BUILD_379_FAMILY_CALENDAR_CHORES.md. Next proposed Build380 Private
AI Helper Across Home and Workshop; eight numbered builds 380–387 plus
deferred MQTT/radio bridge scope remain.

## Build 380 — Private Home/Workshop AI Helper (2026-11-23 SOURCE IMPLEMENTED; FIELD HOLD)

Dedicated owner/admin-only Assistant workspace and read-only API over explicit
indexed, local-only, already owner-approved knowledge sources. Existing
Ollama/Knowledge/voice infrastructure reused; new scoped source allowlist,
local registry-only device selection, citation validation and offline keyword
evidence excerpts. The only voice actions are user-consented transcription
draft and opt-in local TTS. No AI-driven Home Assistant, MQTT, workshop
machine, order, commerce, cloud or external application operation. No new
database migration. Source scorecard: docs/contracts/hub-feature-progress380.json;
operator acceptance: docs/BUILD_380_PRIVATE_HOME_WORKSHOP_HELPER.md. Original
Windows, Ollama, voice device and actual indexed-source acceptance remain
FIELD_HOLD. Next Build381 Windows boot/network sequencing/local recovery;
seven numbered builds 381–387 plus deferred radio/MQTT provenance goal remain.
