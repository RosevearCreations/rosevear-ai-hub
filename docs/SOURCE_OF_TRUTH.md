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
