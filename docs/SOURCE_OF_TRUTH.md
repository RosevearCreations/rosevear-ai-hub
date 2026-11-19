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
