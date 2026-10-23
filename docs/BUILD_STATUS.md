# Build Status

This file records completed and active builds. The roadmap remains authoritative for planned scope.

| Build | Name | Status | Promotion |
|---|---|---|---|
| 001 | Repository and Documentation Foundation | COMPLETE | main via PR #1 |
| 002 | FastAPI Backend Skeleton | COMPLETE | main via PR #2 |
| 003 | Local Database Foundation | COMPLETE | main via PR #3 |
| 004 | React Web UI Foundation | COMPLETE | main via PR #4 |
| 005 | Tauri Desktop Shell | COMPLETE | main via PR #5 |
| 006 | Ollama Discovery | COMPLETE | main via PR #6 |
| 007 | Streaming Chat | COMPLETE | main via PR #7 |
| 008 | Model Profiles | COMPLETE | main via PR #8 |
| 009 | Provider Abstraction | COMPLETE | main via PR #9 |
| 010 | Chat Reliability | COMPLETE | main via PR #10 |
| 011 | File Ingestion | COMPLETE | main via PR #12 |
| 012 | Chunking and Embeddings | COMPLETE | main via PR #13 |
| 013 | Retrieval | COMPLETE | main via PR #15 |
| 014 | Citations | COMPLETE | main via PR #17 |
| 015 | Knowledge Administration | COMPLETE | main |
| 016 | Authentication | COMPLETE | main |
| 017 | Tool Registry | COMPLETE | main |
| 018 | Confirmation Workflow | COMPLETE | main |
| 019 | Audit Log | COMPLETE | main |
| 020 | Secret Management | COMPLETE | main |
| 021 | Home Assistant Connection | COMPLETE | main |
| 022 | Entity Browser | COMPLETE | main |
| 023 | Safe Device Controls | COMPLETE | main |
| 024 | Natural-Language Home Tools | COMPLETE | main |
| 025 | MQTT Foundation | COMPLETE | main |
| 026 | Rule Schema | COMPLETE | main |
| 027 | Event Engine | COMPLETE | main |
| 028 | AI-Assisted Rule Authoring | COMPLETE | main |
| 029 | Automation History and Failure Handling | COMPLETE | main |
| 030 | Notification Layer | COMPLETE | main |
| 031 | Camera Registry and ONVIF Discovery | COMPLETE | main via PR #47 |
| 032 | RTSP / go2rtc Integration | COMPLETE | main via PR #50 |
| 033 | Camera Dashboard and Health | COMPLETE | main via PR #53 |
| 034 | Frigate Adapter | COMPLETE | main via PR #56 |
| 035 | Camera Event Automations | COMPLETE | main via PR #59 |
| 036 | Connector Framework | COMPLETE | main via PR #63 |
| 037 | Devil n Dove Read Connector | COMPLETE | main via PR #66 |
| 038 | Rosie Dazzlers Read Connector | COMPLETE | main via PR #69 |
| 039 | Yard Workers Read Connector | COMPLETE | main via PR #72 |
| 040 | Narrow Confirmed Business Writes | COMPLETE | main |
| 041 | Automatic Service Recovery, Camera Streaming Repair & Startup Cleanup | COMPLETE | main |
| 042 | Local Speech-to-Text | COMPLETE | main |
| 043 | Local Text-to-Speech | COMPLETE | main |
| 044 | Voice Commands and Confirmations | COMPLETE | main |
| 045 | Installable PWA | COMPLETE | main |
| 046 | Private Remote Access via Tailscale + Dual Private Access | COMPLETE | main |
| 047 | Encrypted Backup and Safe Restore | COMPLETE | main via PR #115 |
| 048 | Performance and Resource-Budget Review | COMPLETE | main via PR #120 |
| 049 | Threat Model and Security Review | COMPLETE | main via PR #122 |
| 050 | Disaster Recovery Drill | COMPLETE | main via PR #124 |
| 051 | Production Readiness and Roadmap Renewal | COMPLETE | main via PR #126 |
| 052 | Unified Operations Dashboard & Guided Onboarding | COMPLETE | main via PR #128; Production run 38190554356 GREEN |
| 053 | Local Service Diagnostics & Guided Repair | COMPLETE | main via PR #130; Production run 38247217278 GREEN |
| 054 | Cameras and Event Timeline Workbench | COMPLETE | main via PR #132; Production run 38256907082 GREEN |
| 055 | Knowledge Projects & Collection Workspace | COMPLETE | main via PR #136; Production run 38268949178 GREEN |\n| 056 | Automations Operations Console | COMPLETE | main via PR #140; hotfix run 38285112776 GREEN |\n| 057 | Workshop Equipment & Safety Readiness | COMPLETE | main; UI follow-up production run 38291329247 GREEN |
| 058 | Business Connector Operations Workspace | COMPLETE | dev PR #156; main PR #155; production run 38328892889 GREEN 5/5 |\n| 059 | Conversation, Voice and Knowledge UX | IMPLEMENTED | dev/main checks pending |

## Build 016 acceptance checklist

- [x] one-time first-owner bootstrap
- [x] pre-auth conversation adoption by first owner
- [x] Argon2 password hashing
- [x] opaque cryptographically random session tokens
- [x] only session-token hashes persisted
- [x] HTTP-only SameSite=Strict session cookie
- [x] configurable session expiration
- [x] logout revocation
- [x] owner / administrator / household user / read-only roles
- [x] protected application APIs after bootstrap
- [x] authenticated chat ownership isolation
- [x] owner/admin user administration API
- [x] owner/admin user administration UI
- [x] last enabled owner protection
- [x] administrator privileged-account restrictions
- [x] authentication audit events
- [x] reversible sessions migration
- [x] backend authentication tests
- [x] web authenticated-shell coverage
- [x] security/data-model/environment documentation
- [x] no external identity provider or hosted service required
- [x] dev CI green
- [x] promoted to main
- [x] main CI green
- [x] dev synchronized with main

## Operator setup

After this build reaches the local Hub, open the Hub once and create the first owner account. Use a username of at least 3 characters and a password of at least 12 characters.

No GitHub secret, OAuth application, cloud account, or paid service is required.

## Build 017 acceptance checklist

- [x] stable dotted tool keys
- [x] normalized input schemas
- [x] normalized output schemas
- [x] explicit capabilities
- [x] canonical Level 0–3 risk classes
- [x] confirmation policy derived from risk
- [x] integration ownership metadata
- [x] persistent enable/disable state
- [x] code-owned metadata synchronization preserves operator enable state
- [x] authenticated registry list/detail/summary API
- [x] owner/administrator enable/disable API
- [x] household-user inspection without administration
- [x] read-only mutation protection retained
- [x] Level 3 autonomous enable prohibition
- [x] enable/disable audit evidence
- [x] owner/administrator Tool Registry UI
- [x] risk, capability, integration, and schema visibility in UI
- [x] reversible integrations/tools migration
- [x] database persistence coverage
- [x] migration upgrade/downgrade coverage
- [x] backend registry policy coverage
- [x] authenticated web registry coverage
- [x] no tool execution introduced
- [x] no external service or secret required
- [x] final Build 017 dev CI green
- [x] promoted to main
- [x] final Build 017 main CI green
- [x] dev synchronized with main

## External setup

No external application, API key, OAuth registration, hosted database, secret, or paid service is
required for Build 017.

The registry is local metadata and administration only. Tool execution remains unavailable until
the confirmation workflow is introduced.

## Build 018 acceptance checklist

- [x] persistent confirmation requests
- [x] server-generated exact action previews
- [x] JSON Schema validation of untrusted arguments
- [x] canonical JSON argument normalization
- [x] SHA-256 exact-action argument fingerprint
- [x] Level 2-only confirmation request policy
- [x] disabled-tool request rejection
- [x] Level 3 workflow prohibition
- [x] Owner/Administrator approve/reject decisions
- [x] Household User request support without approval permission
- [x] Read-only mutation protection retained
- [x] configurable confirmation expiry
- [x] HTTP 410 expired-decision/consumption semantics
- [x] exact tool-key matching at consumption
- [x] exact argument matching at consumption
- [x] requester/approver identity binding
- [x] atomic single-use consumption
- [x] replay prevention
- [x] request/approve/reject/expire/consume audit evidence
- [x] Owner/Administrator confirmation queue UI
- [x] exact argument display in confirmation UI
- [x] confirmed knowledge-document deletion
- [x] direct knowledge deletion blocked without confirmation
- [x] destructive delete restricted to Owner/Administrator
- [x] confirmation consume and knowledge deletion share one transaction
- [x] reversible confirmation_requests migration
- [x] migration upgrade/downgrade coverage
- [x] persistence coverage
- [x] backend confirmation policy coverage
- [x] web confirmation workflow coverage
- [x] Windows/Tauri packaging passed on implementation tree
- [x] security/data-model/environment documentation
- [x] no external service, secret, or paid dependency required
- [x] final Build 018 dev CI green
- [x] promoted to main
- [x] final Build 018 main CI green
- [x] dev synchronized with main

## External setup

No external application, API key, OAuth registration, hosted database, secret, or paid service is
required for Build 018.

The confirmation workflow is local Hub state. The default five-minute expiry may be adjusted with
`CONFIRMATION_TTL_SECONDS` if needed.

## Build 019 acceptance checklist

- [x] centralized persistent audit recorder
- [x] centralized recursive audit sanitization
- [x] actor identity on human-initiated events
- [x] first-class tool key metadata
- [x] first-class risk-level metadata
- [x] first-class confirmation evidence
- [x] normalized result status
- [x] immutable timestamped audit records
- [x] existing Build 016–018 audit metadata backfill
- [x] Owner/Administrator audit API
- [x] Household/Read-only audit access denied
- [x] actor filter
- [x] event-type filter
- [x] object/action filters
- [x] tool-key filter
- [x] result-status filter
- [x] confirmation-ID filter
- [x] date-range filters
- [x] free-text identity search
- [x] bounded limit/offset pagination
- [x] audit summary metrics
- [x] Owner/Administrator Audit Log UI
- [x] expandable sanitized arguments/results
- [x] authentication events use central audit writer
- [x] tool-registry changes use central audit writer
- [x] confirmation lifecycle uses central audit writer
- [x] confirmed knowledge-document deletion audit evidence
- [x] password/secret/API-key redaction
- [x] generic token and *_token redaction
- [x] authorization/cookie/credential/private-key redaction
- [x] Bearer/Basic value redaction
- [x] bounded string/depth/collection payloads
- [x] reversible audit schema migration
- [x] historical audit backfill coverage
- [x] backend audit policy/filter/sanitization tests
- [x] authenticated web audit coverage
- [x] Windows/Tauri packaging passed on implementation tree
- [x] security/data-model/build documentation
- [x] no external logging service, secret, or paid dependency required
- [x] final Build 019 dev CI green
- [x] promoted to main
- [x] final Build 019 main CI green
- [x] dev synchronized with main

## External setup

No external logging service, API key, OAuth application, cloud account, secret, hosted database, or
paid subscription is required for Build 019.

Audit data remains local in the Hub database. Build 019 does not automatically prune audit rows;
the documented 180-day retention target remains an operational target until backup/retention
automation is introduced deliberately.

## Build 020 acceptance checklist

- [x] environment-backed secret definitions
- [x] environment source takes precedence over encrypted store
- [x] AES-GCM authenticated encryption for persisted secrets
- [x] separate 256-bit environment-provided master key
- [x] master key never persisted in SQLite
- [x] fresh random nonce per encryption
- [x] stable secret key bound as authenticated associated data
- [x] explicit versioned ciphertext format
- [x] non-secret master-key fingerprint metadata
- [x] optional previous-master-key support during rotation
- [x] per-secret create/rotate/delete
- [x] master-key rewrap
- [x] Home Assistant token secret definition
- [x] MQTT password secret definition
- [x] environment-backed secrets remain outside SQLite
- [x] saved plaintext never returned by API
- [x] saved plaintext never redisplayed by UI
- [x] password-type write-only secret inputs
- [x] Owner/Administrator secret administration
- [x] Household/Read-only secret administration denied
- [x] secret create/rotate/delete/rewrap audit evidence
- [x] submitted secret values excluded from audit payloads
- [x] Pydantic SecretStr configuration redaction
- [x] plaintext absent from persisted ciphertext column
- [x] encrypted storage remains locked without master key
- [x] environment-only secret use remains available without master key
- [x] reversible secret_values migration
- [x] migration upgrade/downgrade coverage
- [x] encryption/persistence/API/role/rotation tests
- [x] authenticated web secret-management coverage
- [x] Windows/Tauri packaging passed on implementation tree
- [x] security/data-model/environment/operations documentation
- [x] no cloud service, OAuth registration, or paid dependency required
- [x] final Build 020 dev CI green
- [x] promoted to main
- [x] final Build 020 main CI green
- [x] dev synchronized with main

## Operator setup

No manual setup is required to keep the Hub running after Build 020.

If encrypted SQLite secret storage will be used, generate a local 32-byte URL-safe base64 master
key and configure it as `SECRET_ENCRYPTION_KEY` on the Hub machine. Keep that key outside GitHub,
logs, tickets, and chat. Environment-backed secrets continue to work without it.

Detailed Windows PowerShell generation and rotation steps are documented in `docs/OPERATIONS.md`.

## Build 021 acceptance checklist

- [x] Home Assistant base URL environment configuration
- [x] Build 020 Home Assistant token resolution reused
- [x] Bearer token remains server-side only
- [x] URL normalized and restricted to http/https
- [x] configurable connection timeout
- [x] authenticated Home Assistant health endpoint
- [x] safe not-configured status
- [x] safe offline status
- [x] rejected-token status without token disclosure
- [x] read-only Home Assistant entity inventory
- [x] entity inventory excludes arbitrary full attributes
- [x] entity identity, domain, state, friendly name and basic metadata
- [x] authenticated Devices UI
- [x] explicit read-only/no-control boundary
- [x] backend adapter tests with mock transport
- [x] backend API configured/offline/unconfigured coverage
- [x] web Home Assistant health/inventory coverage
- [x] no database migration required
- [x] security/integration/operations/build documentation
- [x] no cloud service, OAuth registration, or paid dependency required
- [x] final Build 021 dev CI green
- [x] promoted to main
- [x] final Build 021 main CI green
- [x] dev synchronized with main

## Operator setup

Build 021 can be installed and tested without a live Home Assistant instance because automated tests
use local mock transports.

To connect the real home instance, configure `HOME_ASSISTANT_URL` on the Hub machine and provide a
Home Assistant long-lived access token either as `HOME_ASSISTANT_TOKEN` or through the Owner/Admin
**Secrets** screen. Never paste the token into GitHub, logs, tickets, or chat.

## Build 022 acceptance checklist

- [x] authenticated WebSocket registry discovery
- [x] area registry normalization
- [x] device registry normalization
- [x] entity registry normalization
- [x] live REST state joined to registry metadata
- [x] entity area assignment with device-area fallback
- [x] domain summary counts
- [x] area/domain/device/state/search browser filters
- [x] bounded attribute exposure
- [x] secret-like attribute value redaction
- [x] child-device fields tolerated
- [x] Build 021 status/minimal entity endpoints retained
- [x] no Home Assistant service calls introduced
- [x] CORS PUT regression fixed for secret save/rotation
- [x] CORS preflight regression coverage
- [x] backend WebSocket adapter coverage
- [x] backend entity-browser API coverage
- [x] web entity-browser/filter coverage
- [x] no database migration required
- [x] security/integration/operations/build documentation
- [x] no new credential, cloud service, OAuth registration, or paid dependency
- [x] final Build 022 dev CI green
- [x] promoted to main
- [x] final Build 022 main CI green
- [x] dev synchronized with main

## Operator setup

No additional credential is required beyond Build 021. The existing Home Assistant URL and long-lived token are reused.

## Build 023 acceptance checklist

- [x] bounded Home Assistant light on/off adapter
- [x] bounded Home Assistant switch on/off adapter
- [x] bounded Home Assistant scene activation adapter
- [x] no arbitrary Home Assistant service-call API
- [x] Level-1 tool contract for lights
- [x] Level-1 tool contract for switches
- [x] Level-1 tool contract for non-safety scenes
- [x] exact-entity safe-control allow list
- [x] Owner/Administrator-only allow-list administration
- [x] Household User execution of allow-listed Level-1 controls
- [x] Read-only execution denied
- [x] explicit low-risk acknowledgement on allow-list changes
- [x] allow-list mutation not exposed as an AI tool
- [x] hazardous/safety-looking target deny checks
- [x] action/domain validation
- [x] tool enable-state gate
- [x] registered input-schema validation before execution
- [x] Home Assistant outage blocks writes
- [x] successful execution audit evidence
- [x] failed execution audit evidence
- [x] allow-list policy audit evidence
- [x] Devices UI allow-list administration
- [x] Devices UI allow-listed action buttons
- [x] no database migration required
- [x] security/integration/data-model/operations/build documentation
- [x] no new credential, cloud service, OAuth registration, or paid dependency
- [x] final Build 023 dev CI green
- [x] promoted to main
- [x] final Build 023 main CI green
- [x] dev synchronized with main

## Operator setup

No new credential is required beyond Build 021. The existing Home Assistant URL and long-lived token
are reused. An Owner/Administrator must manually review and save the low-risk entity allow list
before any device write can occur.

## Build 024 acceptance checklist

- [x] Home profile deterministic command interception
- [x] explicit bounded natural-language action parser
- [x] friendly-name resolution
- [x] entity-ID and local-ID exact resolution
- [x] duplicate friendly-name ambiguity handling
- [x] partial-name no-guess behavior
- [x] exact restatement requirement for partial/ambiguous targets
- [x] Build 023 safe-control allow list remains mandatory
- [x] non-allow-listed target blocking
- [x] hazardous/safety-sensitive target blocking
- [x] bulk home-control command blocking
- [x] unsupported action blocking
- [x] action/domain validation
- [x] read-only natural-language execution denied
- [x] exact allow-listed Level-1 direct-execution rule documented
- [x] future Level-2 confirmation boundary retained
- [x] recognized commands bypass LLM device/action selection
- [x] ordinary Home-profile questions still use provider chat
- [x] Home Assistant outage blocks recognized command execution
- [x] Build 023 tool schema / enable-state checks reused
- [x] Build 023 audit evidence reused for executed actions
- [x] chat messages persist deterministic action results
- [x] deterministic home commands work independently of provider runtime state
- [x] parser/resolver unit coverage
- [x] chat execution coverage
- [x] ambiguity no-execution coverage
- [x] no database migration required
- [x] security/integration/architecture/operations/build documentation
- [x] no new credential, cloud service, OAuth registration, or paid dependency
- [x] final Build 024 dev CI green
- [x] promoted to main
- [x] final Build 024 main CI green
- [x] dev synchronized with main

## Operator setup

No new credential is required. Keep the Build 021 Home Assistant connection and Build 023 safe
control allow list. Select the **Home** chat profile and use explicit commands naming one exact
allow-listed entity.

## Build 025 acceptance checklist

- [x] broker host/port configuration
- [x] dedicated broker username configuration
- [x] Build 020 MQTT password resolution reused
- [x] anonymous broker use fails closed
- [x] optional TLS transport
- [x] authenticated broker runtime status
- [x] bounded MQTT topic/filter validation
- [x] fail-closed MQTT topic allow list
- [x] concrete subscribe beneath allowed wildcard
- [x] wildcard subscribe requires exact allow-list entry
- [x] publish topics cannot contain wildcards
- [x] retained publish blocked
- [x] bounded payload size
- [x] QoS 0/1 publish and subscribe
- [x] bounded in-memory received-message buffer
- [x] bounded reconnect delay
- [x] active subscription restoration after reconnect
- [x] broker credentials remain server-side
- [x] MQTT publish audit evidence excludes payload plaintext
- [x] authenticated MQTT UI
- [x] read-only write boundary retained
- [x] MQTT not registered as an AI-executable tool
- [x] no durable automation/event-history claim introduced
- [x] adapter unit coverage with fake broker client
- [x] API publish/subscribe/status/message coverage
- [x] web MQTT status/publish/subscribe coverage
- [x] no database migration required
- [x] security/integration/architecture/operations/build documentation
- [x] no cloud service, OAuth registration, or paid dependency required
- [x] final Build 025 dev CI green — run 37719577138
- [x] promoted to main — PR #34 / merge 57794fa86377f6fc92a888bcb0722558ca8ac067
- [x] final Build 025 main CI green — run 37720743381
- [x] dev synchronized with final main closeout target

## Operator setup

No live broker is required for automated verification. To use MQTT locally, configure a dedicated
authenticated broker account, set `MQTT_HOST`, `MQTT_USERNAME`, and `MQTT_ALLOWED_TOPICS`, and
provide the MQTT password through `MQTT_PASSWORD` or the encrypted **Secrets** screen.

## Build 026 acceptance checklist

- [x] versioned Rule Schema v1
- [x] strict unknown-field rejection
- [x] state-change trigger
- [x] state-threshold trigger
- [x] MQTT-message trigger using Build 025 filter validation
- [x] state-equality condition
- [x] numeric-threshold condition
- [x] one-or-more registered tool actions
- [x] cooldown metadata
- [x] deduplication metadata
- [x] persistent automations table
- [x] unique human-readable automation names
- [x] authenticated schema endpoint
- [x] authenticated rule validation endpoint
- [x] authenticated automation list/detail endpoints
- [x] Owner/Administrator-only rule changes
- [x] Build 018 exact confirmation required for create/update/delete
- [x] update/delete confirmation bound to current-record fingerprint
- [x] Household/Read-only mutation protection retained
- [x] Level 2 tool actions prohibited from automation rules
- [x] Level 3 tool actions prohibited from automation rules
- [x] enabled rules cannot reference disabled tools
- [x] rule execution explicitly deferred to Build 027
- [x] audit evidence for confirmed rule changes
- [x] reversible automations migration
- [x] migration upgrade/downgrade coverage
- [x] backend schema/policy/API coverage
- [x] security/data-model/architecture/build documentation
- [x] no external service, OAuth registration, secret, or paid dependency required
- [x] final Build 026 dev CI green — run 37725781902
- [x] promoted to main — PR #36 / merge 1162fb825e79160b8f729f5a9e52d56eea2ad7c8
- [x] final Build 026 main CI green — run 37726734512
- [x] dev synchronized with final main closeout target

## Operator setup

No external setup is required for Build 026. Rule execution is intentionally unavailable until
Build 027, so no live event source is required for verification.

## Build 027 acceptance checklist

- [x] deterministic event processor independent of the AI model layer
- [x] Home Assistant state_changed WebSocket event intake
- [x] MQTT message callback intake
- [x] bounded 256-event runtime queue
- [x] bounded Home Assistant listener reconnect backoff
- [x] enabled-rule MQTT subscription reconciliation
- [x] state-change trigger evaluation
- [x] state-threshold crossing evaluation
- [x] MQTT topic-filter and optional payload equality evaluation
- [x] state-equality condition evaluation against current Home Assistant state
- [x] numeric-threshold condition evaluation against current Home Assistant state
- [x] persistent cooldown enforcement
- [x] persistent event deduplication tokens
- [x] persistent automation_runs evidence
- [x] raw MQTT payload excluded from automation run evidence
- [x] registered tool schema revalidation immediately before execution
- [x] enabled-tool gate rechecked immediately before execution
- [x] autonomous execution limited to deterministic Build 023 Level-1 Home Assistant tools
- [x] exact Build 023 safe-control allow list retained
- [x] hazardous/safety-looking Home Assistant targets retained as prohibited
- [x] Level 2 and Level 3 tools remain prohibited from autonomous execution
- [x] automation and tool execution audit evidence
- [x] authenticated Event Engine runtime status endpoint
- [x] reversible automation_runs migration
- [x] migration upgrade/downgrade coverage
- [x] event-engine trigger/condition/deduplication/privacy tests
- [x] security/data-model/architecture/integration/operations/build documentation
- [x] no new credential, cloud service, OAuth registration, or paid dependency required
- [x] final Build 027 dev CI green — run 37776822135
- [x] promoted to main — PR #38 / merge 5c601c1e10955696153dc8e8f3767946204db519
- [x] final Build 027 main CI green — run 37778920468
- [x] dev synchronized with final main closeout target

## Operator setup

No new credential is required for Build 027. Existing Build 021 Home Assistant and Build 025 MQTT
configuration are reused. Enabled MQTT-trigger rules are subscribed automatically when the broker is
available. The Build 023 safe-control allow list remains mandatory before any automation can change a
Home Assistant light, switch, or scene.

## Build 028 acceptance checklist

- [x] Owner/Administrator AI authoring boundary
- [x] provider-neutral authoring path through the existing AI registry
- [x] bounded 4,000-character authoring request
- [x] bounded 32,000-character provider response
- [x] JSON-only structured proposal contract
- [x] strict Rule Schema v1 parsing after generation
- [x] current Event Engine action-tool context supplied to the model
- [x] current Home Assistant entity context supplied without credentials
- [x] current safe-control allow-list context supplied without credentials
- [x] current MQTT topic allow-list context supplied without broker credentials
- [x] prompt/context treated as untrusted data in the system instruction
- [x] generated tool references revalidated deterministically
- [x] generated tool arguments revalidated against registered JSON schemas
- [x] disabled tools and non-Event-Engine tools rejected
- [x] Level 2 and Level 3 action boundary retained
- [x] Home Assistant entity and safe-control warnings surfaced for human review
- [x] MQTT allow-list warnings surfaced for human review
- [x] drafts never persist automatically
- [x] drafts recommend disabled creation
- [x] existing exact Level-2 confirmation required before persistence
- [x] explicit second approval required before apply
- [x] authoring audit evidence excludes prompt plaintext
- [x] provider failures fail closed without saving a rule
- [x] Owner/Admin Automations workbench
- [x] exact Rule Schema JSON review surface
- [x] saved-rule visibility in the workbench
- [x] backend authoring/role/validation/confirmation coverage
- [x] web draft/review/confirm/create coverage
- [x] no database migration required
- [x] security/architecture/data-model/operations/build documentation
- [x] no new credential, cloud service, OAuth registration, or paid dependency required
- [x] final Build 028 dev CI green — run 37817853196
- [x] promoted to main — PR #40 / merge aa20a242c9613a98f1e5313a45df64ebc31c105b
- [x] final Build 028 main CI green — run 37819287357
- [x] dev synchronized with final main closeout target

## Operator setup

No new credential is required. AI-assisted authoring uses the already configured provider layer.
For the current local-first deployment, install at least one Ollama model. Keep Home Assistant,
the Build 023 safe-control allow list, and MQTT topic policy configured when those sources are used.
Every generated rule remains unsaved until an Owner/Administrator explicitly approves its exact
Build 018 confirmation.

## Build 029 acceptance checklist

- [x] authenticated durable automation run-history API
- [x] history filter by automation and run status
- [x] bounded history pagination
- [x] automation names joined to run evidence
- [x] run duration exposed when completion time is known
- [x] aggregate history summary counts
- [x] distinct automation failure count
- [x] latest run/failure timestamps
- [x] success/failed/skipped/running/interrupted status vocabulary
- [x] restart recovery converts orphaned running rows to interrupted
- [x] restart recovery preserves prior bounded run evidence
- [x] restart recovery is audit-recorded
- [x] interrupted runs participate in cooldown protection
- [x] unexpected action exceptions are contained to the affected run
- [x] unexpected internal exception text is not persisted to user-facing history
- [x] failed runs include deterministic failure kind
- [x] failed/interrupted runs explicitly disable automatic retry
- [x] partial/uncertain physical actions are never replayed automatically
- [x] Event Engine continues using deterministic rule execution only
- [x] MQTT history retains payload fingerprint rather than raw payload
- [x] runtime reports count of restart-recovered runs
- [x] Automations workbench execution-history summary
- [x] run status filter in the workbench
- [x] run source/duration/action/failure evidence display
- [x] explicit no-auto-retry operator guidance
- [x] backend history/recovery/failure-containment coverage
- [x] web history/failure visibility coverage
- [x] no database migration required
- [x] security/architecture/data-model/operations/build documentation
- [x] no new credential, cloud service, OAuth registration, or paid dependency required
- [x] final Build 029 dev CI green — run 37850602230
- [x] promoted to main — PR #42 / merge 6564d8511214da4fce0625345904cfa994299651
- [x] final Build 029 main CI green — run 37851620839
- [x] dev synchronized with final main closeout target

## Operator setup

No new credential or service is required. Open **Automations → Execution history** to inspect recent
runs and filter by outcome. A failed or interrupted physical-world action is intentionally not
replayed automatically; correct the underlying issue, inspect the run evidence, and allow a new
source event to trigger the rule.

## Build 030 acceptance checklist

- [x] persistent local household notifications
- [x] per-user read state
- [x] per-user dismiss state
- [x] info/warning/urgent severity vocabulary
- [x] authenticated notification list and summary APIs
- [x] bounded notification filtering and pagination
- [x] Owner/Admin local notification test endpoint
- [x] notification creation audit evidence
- [x] Level-1 notification.household.send tool contract
- [x] deterministic Event Engine notification executor
- [x] automation authoring context includes the notification tool
- [x] no Home Assistant dependency for notification execution
- [x] no email/SMS/push/cloud delivery introduced
- [x] external messaging remains Level-2 and out of scope
- [x] persistent Notifications UI for all authenticated roles
- [x] read/dismiss controls are per account
- [x] notification severity and source visibility
- [x] Owner/Admin Send local test action
- [x] contextual circled-i help control on every primary application section
- [x] detailed common-task help
- [x] detailed safety/permission help
- [x] detailed troubleshooting help
- [x] keyboard Escape/close behavior for help panel
- [x] reversible notifications migration 0014
- [x] migration upgrade/downgrade coverage
- [x] notification API and Event Engine coverage
- [x] notification UI coverage
- [x] contextual help coverage for every primary section
- [x] Windows test-server updater with exact-main SHA protection
- [x] test-server update and rollback documentation
- [x] no new credential, OAuth registration, cloud service, or paid dependency required
- [x] final Build 030 dev CI green — run 37875622964
- [x] promoted to main — PR #44 / merge 94d082716804e4810b4bbf2c950a9ca710feb436
- [x] final Build 030 main CI green — run 37876478895
- [x] release-evidence closeout merged — PR #45 / merge 22d8099ffa9b9b53aee656c95cc71770ea6e10c3
- [x] dev synchronized with release-evidence closeout — run 37879008035

## Operator setup

No new variable, account, provider, or external application is required for Build 030. The local
notification inbox works with the existing SQLite database after Alembic revision 0014 is applied.

Build 030 feature promotion and release-evidence closeout are complete. The closeout merge
22d8099ffa9b9b53aee656c95cc71770ea6e10c3 passed main Production run 37878642137 and the
synchronized dev run 37879008035. The test PC must use the final verified Build 030 repository SHA
reported after this evidence-consistency correction is promoted and GREEN.


## Build 031 acceptance checklist

- [x] persistent camera registry
- [x] ONVIF WS-Discovery Probe
- [x] endpoint UUID de-duplication
- [x] normalized private device-service URL, host, port, types, scopes, display name, and last-seen time
- [x] public/non-literal discovery addresses rejected before persistence
- [x] Owner/Administrator-only discovery
- [x] authenticated household/read-only registry viewing
- [x] Owner/Administrator registry enable/disable administration
- [x] discovery completion audit evidence
- [x] registry update audit evidence
- [x] Cameras primary navigation section
- [x] contextual circled-i camera help
- [x] explicit no-stream/no-PTZ/no-public-exposure boundary
- [x] reversible camera migration 0015
- [x] migration upgrade/downgrade coverage
- [x] ONVIF parser/security tests
- [x] camera registry API/role tests
- [x] camera web UI tests
- [x] security/data-model/integration/operations/build documentation
- [x] no camera credential, cloud account, OAuth application, or paid dependency required
- [x] final Build 031 dev CI green — run 37959922788
- [x] promoted to main — PR #47 / merge a972dc26d043efcbc427a32af3a4fec01e69a000
- [x] final Build 031 main Production CI green — run 37961711562
- [x] dev synchronized with final main target after release-evidence closeout

## Operator setup

No credential is required for Build 031 discovery. Open **Cameras** as Owner/Administrator and use
**Scan local network**. If no device appears, verify ONVIF is enabled on the camera and that local
WS-Discovery multicast/UDP 3702 is permitted. Do not expose ONVIF or camera web services publicly.

Build 032 will add RTSP/go2rtc transport. Build 031 intentionally stores discovery metadata only.

Build 031 feature promotion is complete. The exact GREEN dev tree
`e3d0a2f636001444685602922555c204ebe7f131` was promoted through PR #47 to main merge
`a972dc26d043efcbc427a32af3a4fec01e69a000`; main Production run 37961711562 passed all four lanes.
The release-evidence closeout is followed by a final fast-forward synchronization of dev to the
verified main closeout commit.

## Build 032 acceptance checklist

- [x] loopback-only go2rtc HTTP API adapter
- [x] local go2rtc status/version/listener visibility
- [x] RTSP/RTSPS source validation restricted to literal private/local IP addresses
- [x] AES-GCM encrypted camera source URL storage
- [x] source credentials never returned after save
- [x] sanitized cleartext transport metadata only
- [x] Hub-managed go2rtc stream entries are runtime-only and not persisted to YAML
- [x] credential-bearing source patched to go2rtc runtime memory only
- [x] Owner/Administrator stream configuration
- [x] Owner/Administrator stream deletion
- [x] Owner/Administrator stream probe
- [x] Owner/Administrator go2rtc reconcile
- [x] automatic best-effort stream rehydration on Hub startup
- [x] lower authenticated roles receive sanitized transport metadata only
- [x] stable local relay endpoint metadata
- [x] camera transport audit evidence
- [x] Windows go2rtc startup helper
- [x] loopback-only go2rtc config template
- [x] dev-desktop auto-start when go2rtc.exe is installed
- [x] reversible migration 0016
- [x] migration upgrade/downgrade coverage
- [x] go2rtc adapter tests
- [x] encrypted RTSP API/role/security tests
- [x] RTSP/go2rtc web UI coverage
- [x] contextual camera help updated
- [x] security/data-model/integration/architecture/operations/build documentation
- [x] no cloud account, OAuth application, API key, or paid dependency required
- [x] final Build 032 dev CI green — run 37978292252
- [x] promoted to main — PR #50 / merge f42352cc56d78d5d1a393994ad83af15aff72e03
- [x] final Build 032 main Production CI green — run 37978836827
- [x] release-evidence closeout complete through protected-main closeout
- [x] dev synchronized with final main closeout target after closeout promotion

## Operator setup

Real camera transport requires the official go2rtc Windows binary at
`tools\go2rtc\go2rtc.exe`. The Hub keeps safe defaults for localhost ports 1984/8554/8555 and
requires the existing `SECRET_ENCRYPTION_KEY` before saving credential-bearing RTSP sources.

Build 032 deliberately stops at transport configuration/probe/reconcile. Build 033 owns the camera
dashboard and health experience.

Build 032 feature promotion is complete. The exact GREEN dev tree
`2a7e2b491ae8d91404ed4123f774cb178adf4466` passed dev run 37978292252 and was promoted
through PR #50 to main merge `f42352cc56d78d5d1a393994ad83af15aff72e03`. Main Production run
37978836827 passed all four lanes. The protected-main release-evidence closeout is followed
immediately by synchronization back to dev so both branches carry the final release record.

## Build 033 acceptance checklist

- [x] multi-camera dashboard summary
- [x] total / enabled / configured / healthy / attention counters
- [x] explicit camera health states
- [x] stale-health threshold with bounded configuration
- [x] passive dashboard metadata refresh
- [x] passive refresh does not automatically probe/decrypt camera sources
- [x] Owner/Administrator fleet health refresh
- [x] fleet refresh records sanitized audit evidence
- [x] loopback-only viewer URL derived from validated go2rtc base URL
- [x] viewer URL contains stable stream name only, never camera credentials
- [x] embedded local live camera tiles
- [x] live tiles blocked when go2rtc transport is offline/non-local
- [x] Tauri CSP limited to fixed 127.0.0.1:1984 camera frame/media/connect source
- [x] existing ONVIF/RTSP administration retained
- [x] responsive camera dashboard styling
- [x] contextual camera dashboard help
- [x] backend dashboard/health role tests
- [x] web dashboard/live-tile/health tests
- [x] architecture/security/integration/operations/build documentation
- [x] no database migration required
- [x] no new account, secret, cloud service, API key, or paid dependency
- [x] final Build 033 dev CI green — run 37983356417
- [x] promoted to main — PR #53 / merge 9eb8fa52953ff813e026574da46f958ae49a54f6
- [x] final Build 033 main Production CI green — run 37984006237
- [x] release-evidence closeout complete through protected-main closeout
- [x] dev synchronized with final main closeout target after closeout promotion

## Operator setup

Build 033 needs no new credentials or schema migration. Live tiles reuse the Build 032 local go2rtc
binary and encrypted camera RTSP configuration. Health freshness defaults to 300 seconds and may be
adjusted with `CAMERA_HEALTH_STALE_SECONDS`.

Build 033 stops before recording, Frigate analytics, PTZ, talkback, and remote/public camera access.

Build 033 feature promotion is complete. The exact GREEN dev tree
`d23df1c133afb0171501abe56bae75d1faccc5f7` passed dev run 37983356417 and was promoted
through PR #53 to main merge `9eb8fa52953ff813e026574da46f958ae49a54f6`. Main Production run
37984006237 passed all four lanes. The protected-main release-evidence closeout is followed by
synchronization back to dev so both branches carry the final release record.

## Build 034 acceptance checklist

- [x] loopback-only Frigate HTTP adapter
- [x] strict FRIGATE_BASE_URL validation
- [x] Frigate service/version status
- [x] normalized configured-camera capability inventory
- [x] bounded recent event retrieval
- [x] event payload normalization
- [x] maximum event response cap of 100
- [x] authenticated Frigate status/camera/event API
- [x] no Frigate write endpoints
- [x] read_only / household users can view Frigate metadata
- [x] browser never connects directly to Frigate
- [x] Frigate panel integrated into Cameras
- [x] Frigate camera capability display
- [x] recent object-event display
- [x] Frigate offline state isolated from camera dashboard
- [x] backend adapter tests
- [x] backend API/role tests
- [x] Frigate web panel tests
- [x] contextual help updated
- [x] integration/security/architecture/operations/build documentation
- [x] backend/desktop version 0.0.34
- [x] no database migration required
- [x] no new Hub secret required in supported loopback mode
- [x] final Build 034 dev CI green — run 37989129587
- [x] promoted to main — PR #56 / merge 37d7e2d6d0d85b2c719e8c76ca7ba12ae377ff7a
- [x] final Build 034 main Production CI green — run 37989801553
- [x] release-evidence closeout complete through protected-main closeout
- [x] dev synchronized with final main closeout target after closeout promotion

## Operator setup

Frigate is optional. The supported Build 034 mode uses
`FRIGATE_BASE_URL=http://127.0.0.1:5000` and requires that Frigate's internal API remain
loopback-only. No Frigate installation is required for the Hub itself to start or for existing
ONVIF/go2rtc camera functionality to keep working.

Build 034 is read-only. Camera Event Automations begin in Build 035.

Build 034 feature promotion is complete. The exact GREEN dev tree
`0f94819a757c5b55d2e597528786028e61cff7f7` passed dev run 37989129587 and was promoted
through PR #56 to main merge `37d7e2d6d0d85b2c719e8c76ca7ba12ae377ff7a`. Main Production run
37989801553 passed all four lanes. The protected-main release-evidence closeout is followed by
synchronization back to dev so both branches carry the final release record.

## Build 035 acceptance checklist

- [x] frigate_event Rule Schema trigger
- [x] exact label filter
- [x] optional camera, sub-label, zone, score, clip, snapshot filters
- [x] false-positive events ignored by default
- [x] Frigate polling dormant when no enabled camera-event rule exists
- [x] bounded FRIGATE_EVENT_POLL_SECONDS setting
- [x] first-use historical event baseline suppression
- [x] bounded persistent seen-event checkpoint
- [x] automatic per-rule Frigate event-ID deduplication
- [x] chronological unseen-event queueing
- [x] Frigate events reuse Home Assistant state conditions
- [x] Frigate events reuse existing deterministic Level-1 action executors
- [x] Level-2/Level-3 autonomous actions remain prohibited
- [x] existing safe-control allow list and hazard checks remain enforced
- [x] no automatic replay after failed/interrupted physical actions
- [x] runtime reports Frigate rule count, online state, seen-event count, last poll
- [x] AI rule authoring receives Frigate context when available
- [x] automation UI exposes Frigate runtime state
- [x] backend trigger validation tests
- [x] Event Engine execution/dedup/filter tests
- [x] Frigate runtime baseline/restart tests
- [x] web runtime display tests
- [x] architecture/security/integration/operations/build documentation
- [x] backend/desktop version 0.0.35
- [x] no database migration required
- [x] no new Hub secret or paid dependency
- [x] final Build 035 dev CI green — run 37994790023
- [x] promoted to main — PR #59 / merge 9a0aa3edb478cf831bbe2572e0da9c135f36f67b
- [x] final Build 035 main Production CI green — run 37995199684
- [x] release-evidence closeout complete through protected-main closeout
- [x] dev synchronized with final main closeout target after closeout promotion

## Operator setup

Build 035 adds no migration or secret. Frigate remains optional. Camera-event polling starts only
when at least one enabled frigate_event rule exists. The first successful poll establishes a
non-executing baseline of current Frigate history; later unseen events may enter the deterministic
Event Engine.

Safe default: `FRIGATE_EVENT_POLL_SECONDS=2` with an accepted range of 1–60 seconds.

Build 035 feature promotion is complete. The exact GREEN dev tree
`f154326fcf51b739c6cc7040cdcdf79ff785fce0` passed dev run 37994790023 and was promoted
through PR #59 to main merge `9a0aa3edb478cf831bbe2572e0da9c135f36f67b`. Main Production run
37995199684 passed all four lanes. The protected-main release-evidence closeout is followed by
synchronization back to dev so both branches carry the final release record.

## Next build

**Build 036 — Connector Framework**



## Build 036 acceptance checklist

- [x] common business connector descriptor contract
- [x] normalized connector capabilities and safe status model
- [x] normalized configuration/unavailable/not-found/write-blocked errors
- [x] deterministic connector registry with duplicate-key protection
- [x] read-only-by-default policy
- [x] business writes blocked by the base framework
- [x] write confirmation requirement represented in connector metadata
- [x] Devil n Dove planned read connector registration
- [x] Rosie Dazzlers planned read connector registration
- [x] Yard Workers planned read connector registration
- [x] authenticated business connector list/detail API
- [x] Business navigation section and connector overview UI
- [x] contextual circled-i Business help
- [x] backend framework/API tests
- [x] web connector overview tests
- [x] backend/desktop version 0.0.36
- [x] no database migration required
- [x] no new secret, OAuth application, cloud account, paid dependency, or external request
- [x] final Build 036 dev CI green — run 37999279494
- [x] promoted to main — PR #63 / merge f428d5d1125e4d0aeb446106083dc1bb3404b6d5
- [x] final Build 036 main Production CI green — run 38000148371
- [x] release-evidence closeout complete through protected-main closeout
- [x] dev synchronized with final main closeout target after closeout promotion

## Build 036 operator setup

No manual setup is required. Build 036 deliberately does not ask for Devil n Dove, Rosie Dazzlers,
or Yard Workers credentials. The three registrations describe the future read surfaces only.


Build 036 feature promotion is complete. The exact GREEN dev tree
`c5e27db629afc134b35c8dad53d905787d5793fa` passed dev run 37999279494 and the protected
main PR gate run 37999782415. It was promoted through PR #63 to main merge
`f428d5d1125e4d0aeb446106083dc1bb3404b6d5`. Main Production run 38000148371 passed all
four lanes. This protected-main release-evidence closeout is followed by synchronization back to dev
so both branches carry the final release record.

## Next build

**Build 037 — Devil n Dove Read Connector**


## Build 037 acceptance checklist

- [x] concrete Devil n Dove implementation of the Build 036 connector contract
- [x] GET-only server-side Devil n Dove client
- [x] remote HTTPS enforcement with loopback-only HTTP exception
- [x] existing Devil n Dove bearer-compatible admin session authentication reused
- [x] Devil n Dove credential added to Build 020 secret definitions
- [x] environment-backed `DEVILNDOVE_ADMIN_TOKEN` supported
- [x] configurable `DEVILNDOVE_BASE_URL` and bounded timeout
- [x] lightweight Product picker used for catalogue reads
- [x] catalogue reads capped at 50 records
- [x] order reads capped at 100 records
- [x] Inventory-owned read contract used for inventory
- [x] inventory reads capped at 100 records and tools excluded
- [x] no arbitrary upstream path or method passthrough
- [x] normalized bounded upstream fields
- [x] connector status does not spend live D1 read quota
- [x] sanitized configuration, authentication, network, and provider errors
- [x] authenticated Hub read endpoint for connector resources
- [x] Business UI live read controls and bounded preview
- [x] contextual circled-i Business help updated
- [x] backend adapter, framework, and API tests
- [x] web read-preview tests
- [x] backend and desktop version 0.0.37
- [x] no database migration required
- [x] no new paid dependency or Devil n Dove repository change
- [x] business writes remain blocked
- [x] final Build 037 dev CI green — run 38018166942
- [x] promoted to main — PR #66 / merge e32ba9730b81c835a1ee6d461863e508715e30f2
- [x] protected-main promotion gate green — run 38018435266
- [x] final Build 037 main Production CI green — run 38018791124
- [x] release-evidence closeout complete through protected-main closeout
- [x] dev synchronized with final main closeout target after closeout promotion

## Build 037 operator setup

Build 037 can deploy while unconfigured. Live reads require a currently valid Devil n Dove admin
session credential stored as **Secrets → Devil n Dove admin token** or
`DEVILNDOVE_ADMIN_TOKEN`. The credential is bearer-equivalent, can expire or be revoked, and never
enters browser state. The default origin is `https://devilndove.com`; no Devil n Dove application
change is required.


Build 037 feature promotion is complete. The exact GREEN dev tree
`62f866052ca23de1449be1cd57830b748e66e4f8` passed dev run 38018166942 and protected-main
promotion gate run 38018435266. It was promoted through PR #66 to main merge
`e32ba9730b81c835a1ee6d461863e508715e30f2`. Main Production run 38018791124 passed all
four lanes; the backend reported 158 passed tests with 9 warnings. This protected-main
release-evidence closeout is followed by synchronization back to dev so both branches carry the
final release record.

## Build 038 acceptance checklist

- [x] concrete Rosie Dazzlers implementation of the Build 036 connector contract
- [x] remote HTTPS enforcement with loopback-only HTTP exception
- [x] existing opaque Rosie Dazzlers `rd_staff_session` authentication reused
- [x] Rosie Dazzlers credential added to Build 020 secret definitions
- [x] environment-backed `ROSIEDAZZLERS_STAFF_SESSION_TOKEN` supported
- [x] configurable `ROSIEDAZZLERS_BASE_URL` and bounded timeout
- [x] exact four-endpoint read allow list; no arbitrary path or method passthrough
- [x] booking reads capped at 100 through existing read-only bookings search contract
- [x] customer reads capped at 100 through existing read-only customer list contract
- [x] job reads capped at 80 through existing detailer workspace contract
- [x] inventory reads capped at 100 through existing inventory list contract
- [x] normalized/privacy-minimized upstream records
- [x] connector status does not contact Rosie Dazzlers
- [x] authenticated Hub read endpoint reused for Rosie Dazzlers resources
- [x] Business UI live read controls and bounded preview
- [x] contextual circled-i Business help updated
- [x] backend adapter/framework/API tests
- [x] web read-preview tests
- [x] backend and desktop version 0.0.38
- [x] no database migration required
- [x] no new paid dependency or Rosie Dazzlers repository change
- [x] business writes remain blocked
- [x] final Build 038 dev CI green — run 38054235678
- [x] promoted to main — PR #69 / merge d562ca796fa05a88853977b46fa22553dba3c573
- [x] protected-main promotion gate green — run 38054594711
- [x] final Build 038 main Production CI green — run 38055745019
- [x] release-evidence closeout complete through protected-main closeout
- [x] dev synchronized with final main closeout target after closeout promotion

## Build 038 operator setup

Build 038 can deploy while unconfigured. Live reads require a current Rosie Dazzlers staff session
token stored as **Secrets → Rosie Dazzlers staff session token** or
`ROSIEDAZZLERS_STAFF_SESSION_TOKEN`. The token is the value of the Rosie Dazzlers
`rd_staff_session` cookie, can expire or be revoked, and never enters browser state. The default
origin is `https://rosiedazzlers.ca`; no Rosie Dazzlers application change is required.

Build 038 feature promotion is complete. The exact GREEN dev tree
`c91aac71776723e6628a8378b696f584a2215316` passed dev run 38054235678 and protected-main
promotion gate run 38054594711. It was promoted through PR #69 to main merge
`d562ca796fa05a88853977b46fa22553dba3c573`. Main Production run 38055745019 passed all
four lanes; the backend reported 164 passed tests with 9 warnings and the Windows executable
artifact was uploaded successfully. This protected-main release-evidence closeout is followed by
synchronization back to dev so both branches carry the final release record.

## Build 039 acceptance checklist

- [x] concrete Yard Workers implementation of the Build 036 connector contract
- [x] verified against Yard Workers source commit 8514825087326bdfe8b5de0e0c96d937ac7c10ee
- [x] existing protected Shared Core read endpoint reused without Yard Workers source changes
- [x] remote HTTPS enforcement with loopback-only HTTP exception
- [x] signed-in Supabase access token and paired API key remain backend-only
- [x] Yard Workers credentials added to Build 020 secret definitions
- [x] environment-backed YARDWORKERS_ACCESS_TOKEN and YARDWORKERS_ANON_KEY supported
- [x] configurable YARDWORKERS_BASE_URL and bounded timeout
- [x] exact POST /functions/v1/core-data-read contract; no arbitrary path or method passthrough
- [x] fixed Jobs module view authority for all Build 039 reads
- [x] Clients, Jobs, Crew, and Equipment resources capped at 100 returned records
- [x] upstream read_only=true confirmation required
- [x] normalized/privacy-minimized records; client-site street addresses omitted
- [x] connector status performs no network request
- [x] authenticated Hub read endpoint reused
- [x] Business UI live read controls and bounded preview
- [x] contextual circled-i Business help updated
- [x] backend adapter/framework/API tests
- [x] web read-preview tests
- [x] backend and desktop version 0.0.39
- [x] no database migration required
- [x] no new paid dependency or Yard Workers repository change
- [x] business writes remain blocked
- [x] final Build 039 dev CI green — run 38060792723
- [x] promoted to main — PR #72 / merge 2633b96598ba10cd833a3b384996b05c46e6c165
- [x] protected-main promotion gate green — run 38061206759
- [x] final Build 039 main Production CI green — run 38061484574
- [x] release-evidence closeout complete through protected-main closeout
- [x] dev synchronized with final main closeout target after closeout promotion

## Build 039 operator setup

Build 039 can deploy while unconfigured. Live reads require both a current signed-in Yard Workers
Supabase access token and the project anon/publishable API key, preferably stored as **Secrets →
Yard Workers access token** and **Secrets → Yard Workers API key**. The access-token user must be
active and have Jobs module view permission. Environment fallbacks are YARDWORKERS_ACCESS_TOKEN and
YARDWORKERS_ANON_KEY. The default Supabase project origin is
`https://jmqvkgiqlimdhcofwkxr.supabase.co`; no Yard Workers application change is required.

Build 039 feature promotion is complete. The exact GREEN dev tree
`b2e69035fe9459629b2c219e15700acd7e67af4d` passed dev run 38060792723 and protected-main
promotion gate run 38061206759. It was promoted through PR #72 to main merge
`2633b96598ba10cd833a3b384996b05c46e6c165`. Main Production run 38061484574 passed all
four lanes; the backend reported 173 passed tests with 9 warnings and the Windows executable
artifact was uploaded successfully. This protected-main release-evidence closeout is followed by
synchronization back to dev so both branches carry the final release record.

## Build 040 acceptance checklist

- [x] implementation begins from synchronized Build 039 closeout SHA 5b601ac1ed304b02a6a2fe590477c5e652a0447a
- [x] current source mutation contracts reviewed in all three connected business repositories
- [x] Devil n Dove exact review-only story-draft operation selected
- [x] Devil n Dove publish/approval/status mutation is not exposed
- [x] Yard Workers exact private internal job-comment operation selected
- [x] Yard Workers client visibility, special-instruction, and job-instruction mutation forced off
- [x] Rosie Dazzlers remains read-only because current save APIs are broader than Build 040 safety scope
- [x] two Level-2 confirmation-required tool definitions registered
- [x] exact canonical argument schemas with bounded text and positive record IDs
- [x] Owner/Admin confirmed-write execution endpoint
- [x] confirmation consumed before external mutation to prevent replay
- [x] failed/uncertain provider outcomes are never automatically retried
- [x] success, blocked, failed, and uncertain writes generate Hub audit evidence
- [x] Business UI separates prepare, approve, and execute steps
- [x] contextual circled-i Business help updated
- [x] adapter, connector, confirmation/replay, and web flow tests added
- [x] backend and desktop version 0.0.40
- [x] no Hub or source-system database migration
- [x] no new package or paid service dependency
- [x] no source-system repository change required
- [ ] final Build 040 dev CI green
- [ ] promoted to main
- [ ] protected-main promotion gate green
- [ ] final Build 040 main Production CI green
- [ ] release-evidence closeout complete
- [ ] dev synchronized with final main closeout target

## Build 040 operator policy

Build 040 does not enable general business editing. Devil n Dove can only receive a new
Draft / Needs-review product story record. Yard Workers can only receive a private internal update
comment. Rosie Dazzlers has no write operation. Each write requires a fresh exact Level-2
confirmation. The confirmation is consumed before contacting the source system; after a timeout or
failure, inspect the source system before preparing another confirmation.

## Next build

**Build 044 — Voice Commands and Confirmations**


## Build 041 — Automatic Service Recovery, Camera Streaming Repair & Startup Cleanup

- [x] Recovery runner and companion scheduler installer merged to `main` (#81, #87)
- [x] Verified recovery runner was installed on Windows server at `eecab70ecbbb9163258a196ca520d283f82635d1`
- [x] Backend tests plus web checks passed on Windows test server after update
- [x] PR #87 CI run 38094872846 passed docs/backend/web/Windows desktop lanes
- [x] Five-minute recovery task `Rosevear AI Hub Recovery` executes with result 0, leaving original logon startup task intact
- [x] Controlled go2rtc restart: PID 8636 → 18484
- [x] Controlled web Vite restart: PID 24508 → 10160; HTTP 200
- [x] Controlled backend API restart: PID 24000 → 28668; `API recovered.`; health `ok`
- [x] The API, web and go2rtc healthy-state and recovery logs validated
- [ ] Separate post-merge Production CI push run not independently verified through connected GitHub workflow interface
- [ ] Camera feeds are not configured: go2rtc streams endpoint previously returned `{}`; end-to-end video not verified

Core Windows service-recovery acceptance is GREEN. Do not interpret that as successful capture/playback from Bell, SkyBell, NOOIE, Littlelf, Blink, or other cloud-managed cameras. Camera feed onboarding remains separate and model-specific. Production release status is conditional on the outstanding CI evidence. See `docs/BUILD_041_AUTOMATIC_RECOVERY.md`.


## Build 042 — Local Speech-to-Text

- [x] Implemented authenticated local STT status and transcription endpoints
- [x] Explicit optional local whisper.cpp binary + GGML model paths, no automatic downloads
- [x] 20-second browser microphone recorder and editable Chat transcript (no auto-send)
- [x] WAV PCM16 mono/16 kHz validation, size/time bounds, safe local subprocess and temp-file cleanup
- [x] Backend and browser WAV unit tests added
- [x] Contextual circled-i Chat help and local setup/rollback documentation
- [x] No database migration, no paid provider, no Windows startup changes
- [ ] Full dev CI and PR/main promotion acceptance
- [ ] Local Windows microphone and real Whisper model acceptance (requires optional installed engine/model)
- [ ] Post-merge main Production CI evidence and release closeout

Build 043 remains Local Text-to-Speech. Build 044 remains Voice Commands and Confirmations.


## Build 043 — Local Text-to-Speech

- [x] Authenticated local Windows SAPI TTS status and synthesis endpoints
- [x] Bounded text, temporary input/output cleanup, sanitized errors and validated PCM WAV
- [x] Explicit Speak/Speak excerpt/Stop voice on completed assistant messages
- [x] Single active browser player with cancellation and object URL cleanup
- [x] Contextual circled-i Chat help; no automated voice, cloud voice or paid provider
- [x] Backend and web regression tests; no database migration or startup task edits
- [ ] Dev/main CI and protected promotion evidence
- [ ] Windows server version 0.0.43 and authenticated browser session verification
- [ ] Physical Windows SAPI voice playback and Stop acceptance
- [ ] Post-merge main Production CI evidence

See `docs/BUILD_043_LOCAL_TTS.md` for setup, privacy, rollback and operational acceptance. Build 044 is the next planned milestone.


## Build 044 — Voice Commands and Confirmations

- [x] Authenticated read-only server preview reusing deterministic Home-language safety resolution
- [x] Separate transcript/command field with explicit review and confirm, never automatic chat/device action
- [x] Exact allow-listed low-risk light/switch/scene actions reuse audited Home Assistant control API
- [x] Prohibit unsafe, bulk, ambiguous, unsupported or non-allowlisted voice commands
- [x] Backend and web regression coverage including permissions and stale preview
- [x] No database migration, cloud service, paid service or startup-task changes
- [ ] Final dev/main CI promotion GREEN
- [ ] Test-server backend verified v0.0.44 and browser reauthenticated
- [ ] Real local voice/confirm/device action end-to-end tested and audited
- [ ] Separate main push Production CI confirmed

See `docs/BUILD_044_VOICE_COMMANDS.md`. Build 045 — Installable PWA remains next.


## Build 045 — Installable PWA

- [x] Added standalone scoped manifest, 192px/512px PNG icons and browser metadata
- [x] Implemented service worker with tightly bounded public asset cache and secure offline screen
- [x] Excludes all API/authentication, signed-in pages, chat, device actions, cameras, uploads and remote endpoints from caching
- [x] Added opt-in install prompt, online/offline feedback, desktop/mobile installation instructions and circled-i help
- [x] Added Vitest coverage for manifest, install prompt, worker request boundary and offline privacy
- [x] Maintained existing Windows logon/recovery tasks and backend ports without migration or paid service
- [ ] Dev/main CI fully green and promotion
- [ ] Windows PWA installation and offline fallback operator acceptance
- [ ] Separate push-triggered main Production CI verified

See `docs/BUILD_045_INSTALLABLE_PWA.md` for security, smoke tests and rollback. Next is Build 046 — Private Remote Access via Tailscale.


## Build 046 — Private Remote Access via Tailscale

- [x] Added opt-in private HTTPS Tailscale Serve plan with loopback-only FastAPI target
- [x] Serve production PWA and API from the same local backend origin
- [x] Remote browsers use relative /api; local Vite/Tauri retain existing loopback API
- [x] HTTPS logins set Secure/HttpOnly/SameSite session cookies; Hub role checks remain
- [x] Windows preflight/enable script refuses insecure listener, missing build and existing Serve/Funnel configs
- [x] System/private-access UI and circled-i help, no remote login claims or private information displayed
- [x] Unit tests for HTTPS cookie and remote/local routing; no paid service, migration or public exposure
- [ ] Dev and main CI verified and promoted
- [ ] Main push Production CI verified GREEN
- [ ] Operator installs/joins Tailscale, restricts ACL grants, authorizes background Serve and checks client HTTPS/PWA login
- [ ] Confirm off-tailnet client cannot access and streaming limitations are understood

See `docs/BUILD_046_TAILSCALE_PRIVATE_ACCESS.md`. Next Build 047 — Backup and Restore.


## Build 047 — Encrypted Backup and Restore

- [x] SQLite online backup snapshot with integrity validation
- [x] authenticated encrypted archive using scrypt and AES-256-GCM
- [x] knowledge originals and local go2rtc configuration included
- [x] manifest SHA-256 hashes and safe-path validation
- [x] verify and restore into new directory, never overwrite live data
- [x] local CLI only; no network endpoint, migration or cloud service
- [x] operator recovery and master-key escrow documented
- [x] dev CI GREEN on verified Build 047 tree
- [x] protected main promotion via PR #115
- [x] push-triggered main Production CI GREEN — workflow run 38155340556
- [x] production commit recorded — `b6c5a7adde6d831f8df4e057dbe886f07c2446f4`
- [ ] on-server offline recovery drill (operator acceptance; intentionally separate from code release)


### Build 047 release closeout

Code release is **GREEN and COMPLETE**. The verified `dev` candidate and PR #115 `main` merge had the same Git tree (`ab12137e10f6f3c4a15003690b8fc8feeaf25f03`). The on-server recovery drill remains a deliberate operator acceptance task and does not reopen the code release. Next queued build: **Build 048 — Performance and Resource-Budget Review**.

## Build 048 — Performance and Resource-Budget Review

- [x] read-only resource collector: API resident memory, CPU seconds, host RAM and workspace-volume free disk
- [x] owner/administrator-only resource endpoint, Cache-Control no-store, generic errors and data minimization
- [x] advisory warning boundaries, no automatic cleanup/termination/polling/telemetry
- [x] manual Refresh panel on System, version supplied by running API instead of stale Home Build 036
- [x] backend threshold and role tests, web GiB formatter test and Windows review guide
- [ ] development CI all lanes GREEN
- [ ] production PR checks GREEN
- [ ] post-merge main Production workflow GREEN
- [ ] on-Windows idle/normal-workload measurements recorded (separate operator acceptance)

See docs/BUILD_048_PERFORMANCE_RESOURCE_BUDGET.md. No database migrations.

## Build 049 — Threat Model and Security Review

- [x] prioritized threat register covering local network, remote clients, sessions, backups and device controls
- [x] disable public interactive API documentation and HTTP schema
- [x] revoke active target-account sessions with password rotation
- [x] private API no-store + browser anti-framing, no-referrer, nosniff response headers
- [x] deterministic backend regression tests and Windows/local acceptance guide
- [x] explicit residual-risk checklist for ACLs, Caddy certificates, network and backup security
- [ ] development backend/web/Windows/docs CI GREEN
- [ ] production pull-request CI GREEN
- [ ] post-merge production main CI GREEN
- [ ] operator negative remote-access tests and Windows acceptance (not established by CI)

See docs/BUILD_049_THREAT_MODEL_SECURITY_REVIEW.md. No migrations.

## Build 050 — Disaster Recovery Drill

- [x] synthetic encrypted archive round-trip, file contents and SQLite schema/record checks
- [x] read-only operator-archive rehearsal to an isolated temporary directory
- [x] no-clobber JSON evidence with archive hash, file/byte counts and SQLite integrity
- [x] wrong-passphrase and tamper refusal; cleanup and live-source-preservation tests
- [x] dedicated Windows recovery tests and synthetic command-line smoke gate
- [x] operator-runbook for backups, separate master key, offline escrow, gaps and RPO/RTO
- [ ] development CI all checks GREEN
- [ ] production PR CI all checks GREEN
- [ ] post-merge main production CI GREEN
- [ ] local Windows operator synthetic + real household archive rehearsals (separate acceptance)

See docs/BUILD_050_DISASTER_RECOVERY_DRILL.md. No migrations or service restarts.

## Build 051 — Production Readiness and Roadmap Renewal

- [x] read-only loopback-only API health/version/private-route security preflight
- [x] no redirects, environment proxy or operator-supplied host
- [x] exclusive-create metadata-only JSON; never return credentials or API bodies
- [x] fail-closed Windows check for nonloopback Hub API listeners
- [x] negative tests for version drift, unsafe public route, redirect, network failures
- [x] operator production acceptance matrix separates GitHub CI and home LAN/Tailscale/recovery evidence
- [x] roadmap renewed to Build 052–060 with practical multi-project application scope
- [ ] development five-check CI GREEN
- [ ] production PR five-check CI GREEN
- [ ] separate post-merge main Production GREEN
- [ ] live Windows operator preflight, network certificate/ACL and real archive acceptance (manual)

See docs/BUILD_051_PRODUCTION_READINESS.md. No migrations or service changes.

## Build 052 — Unified Operations Dashboard & Guided Onboarding

- [x] read-only user-selectable Home / Workshop / Business contexts
- [x] safe service status summaries, optional/unconfigured and inaccessible state distinctions
- [x] manual Refresh only, no background polling, writes or privileged action bypass
- [x] guided setup steps and accessible buttons opening existing pages
- [x] source/permission caution and regression tests; version 0.0.52
- [ ] development five CI jobs GREEN
- [ ] production candidate five CI jobs GREEN
- [ ] independent post-merge main production GREEN
- [ ] operator local Windows/TEMPLAR acceptance (separate)

See docs/BUILD_052_OPERATIONS_DASHBOARD.md. Next Build 053 — Local Service Diagnostics & Guided Repair.


## Build 053 — Local Service Diagnostics & Guided Repair

- [x] Five existing read-only local status checks, no new API or database schema
- [x] Owner/admin-only guided Windows checks and stable recovery-log pointer
- [x] No raw sensitive errors/hosts/credentials in summaries, unavailable != offline
- [x] No automatic process repair, MQTT publish, device commands or restarts
- [x] Pure classifier regression tests; version 0.0.53
- [ ] Five dev CI jobs GREEN
- [ ] Five production PR CI jobs GREEN
- [ ] Independent post-merge main Production CI GREEN
- [ ] Windows device, browser, camera and VM acceptance (operator owned)

See docs/BUILD_053_LOCAL_SERVICE_DIAGNOSTICS.md. Next Build 054 — Cameras and Event Timeline Workbench.


## Build 054 — Cameras and Event Timeline Workbench

- [x] Camera/object/review filtering and newest/oldest timeline sorting
- [x] Owner/admin SQLite review notes with 0017 additive migration
- [x] Cached local metadata view when Frigate is offline
- [x] Explicit private metadata-only CSV acknowledgement; 100 rows and spreadsheet formula protection
- [x] No RTSP credentials, clips, snapshots, Frigate writes or automatic cleanup
- [x] UI/backend tests, migration review, Windows generic updater
- [ ] dev CI five jobs GREEN
- [ ] production PR five jobs GREEN
- [ ] separate post-merge main Production CI GREEN
- [ ] Windows physical server backup/migration and viewer acceptance (manual)

See docs/BUILD_054_CAMERA_TIMELINE.md. Next Build 055 — Knowledge Projects & Collection Workspace.


## Build 055 — Knowledge Projects & Collection Workspace

- [x] Per-project source summaries and explicit search/evidence context
- [x] Local owner/admin source review, bounded notes and audit without note text
- [x] Duplicate-aware multi-project source routing remains manual
- [x] Up to three explicit sequential local indexing jobs per confirmation
- [x] No schema migration, automatic uploads, publications or background tasks
- [x] Generic updater PSScriptRoot-empty fix and local operator guide
- [ ] Five dev CI jobs GREEN
- [ ] Five production PR CI jobs GREEN
- [ ] Independent post-merge main Production CI GREEN
- [ ] Windows Hub operator acceptance (separate)

See docs/BUILD_055_KNOWLEDGE_PROJECTS.md. Next Build 056 — Automations Operations Console.


## Build 056 — Automations Operations Console

- [x] Rule trigger source/readiness, queue, evidence and retry-prevention statuses
- [x] Exact confirmation required for owner-controlled pause/enable; no replay
- [x] Ollama outage no longer blocks existing operations/status/history
- [x] Backend maintenance with verified port/process ownership, explicit stop/start and version checks
- [x] Persistent maintenance logs and Windows .cmd console capture
- [x] Windows PowerShell parser gates and operator runbook
- [ ] dev CI five jobs GREEN
- [ ] production PR CI five jobs GREEN
- [ ] independent post-merge main CI GREEN
- [ ] Real Windows backup, migration and service acceptance (operator controlled)

See docs/BUILD_056_AUTOMATION_OPERATIONS.md. Next Build 057 — Workshop Equipment & Safety Readiness.


## Build 057 — Workshop Equipment & Safety Readiness

- [x] Multi-project owner/admin workstation and equipment register
- [x] Explicit hazard labels, statuses, overdue maintenance and manual inspection history
- [x] "Observed OK" never authorizes equipment operation
- [x] Cross-project workstation guard, role checks and audited writes
- [x] Additive Alembic migration 0018 and isolated regression tests
- [x] Help, runbook, server version and no device control
- [ ] 5 development CI jobs GREEN
- [ ] 5 production PR CI jobs GREEN
- [ ] independent main push Production CI GREEN
- [ ] real Windows backup/migration & manual operator acceptance

Next: Build 060 — Guided Release Adoption & Practical Workflow Acceptance.


## Build 057 screenshot acceptance follow-up

- [x] Business story and MQTT forms: responsive controls and distinct labels
- [x] Home Assistant/MQTT unavailability guidance; no new write actions
- [x] Frigate explicitly optional when local service is offline
- [x] UI regression checks; no backend migration
- [ ] Real Windows service reachability and credential acceptance (operator-controlled)

See docs/BUILD_057_UI_DIAGNOSTICS.md.

## Build 058 — Business Connector Operations Workspace

Read-only configuration and per-resource manual-read evidence for Devil n Dove,
Rosie Dazzlers and Yard Workers, preserving the two existing exact-confirmation
narrow writes. See [operator runbook](BUILD_058_BUSINESS_CONNECTOR_OPERATIONS.md).


## Build 059 — Conversation, Voice and Knowledge UX

Manual Chat-to-Knowledge question handoff, query-evidence invalidation, safer
conversation switching and new-chat failures, plain-language privacy and confirmation
instructions and mobile layout. See [Build 059 operator runbook](BUILD_059_CONVERSATION_VOICE_KNOWLEDGE.md).



## Build 060 — Guided Release Adoption & Practical Workflow Acceptance

- [x] Home/Workshop/Business manual acceptance cards on owner/admin System page
- [x] Local-browser checklist and metadata-only copyable handoff; not a live audit or machine status
- [x] Explicit opt-in hourly Windows Scheduled Task with no new inbound access or credentials
- [x] Exact main SHA + independent push + five-job GREEN gate (no PR-only acceptance)
- [x] Approved remote, clean main, fast-forward-only, migration HOLD and single-run lock
- [x] Verify known API/Vite ownership; no blind process kill, forced reset, device writes or VM changes
- [x] Backend and web restart through existing safe recovery path; local log and JSON evidence
- [x] Windows pure-policy regression cases, syntax gate and Web tests
- [ ] dev CI five jobs GREEN
- [ ] main promotion PR five jobs GREEN
- [ ] independent main push Production CI GREEN
- [ ] Windows user has opted in via one-time task installation and completed physical acceptance

See docs/BUILD_060_GUIDED_RELEASE_ADOPTION.md. Next: Build 061 — Release Recovery Assurance & Verified Backup Gates.


## Build 061 — Release Recovery Assurance & Verified Backup Gates

- [x] Read-only local release assurance console and clickable Windows .cmd shortcut
- [x] Managed SHA, retained release metadata, journal and schema alignment classification
- [x] Fresh prior encrypted backup evidence is hash/freshness checked, not recreated or restored by the report
- [x] Distinct same-schema rollback baseline required to pass metadata check
- [x] Explicit UNVERIFIED gates for real Windows failover, browser acceptance, off-machine backups and Scheduled Task
- [x] Unit tests for malformed records, interrupted recovery, source mismatch, absent key, schema drift and no filesystem writes
- [x] No live server access, new SQL migration, backend API, device writes or background task
- [ ] Dev CI 5/5 GREEN
- [ ] Production PR CI 5/5 GREEN
- [ ] Independent post-merge main Production CI 5/5 GREEN
- [ ] Real Windows server adoption/rollback acceptance (owner-controlled, not implied by CI)

See docs/BUILD_061_RELEASE_ASSURANCE.md. Next: Build 062 — Managed Enrollment Acceptance & Update Observability.


## Build 062 — Managed Enrollment Acceptance & Update Observability
- [x] Read-only local updater/evidence summary with owner/admin protected no-store API
- [x] Fixed enum statuses, 40-character SHAs and validated UTC timestamps; no raw logs/secrets
- [x] Bounded Windows Scheduled Task and Application failure-event inspection, no mutation
- [x] System owner-only manual Refresh panel; never represents metadata as live rollback acceptance
- [x] Tests for missing/invalid evidence, privacy isolation, owner/household permissions and UI manual refresh
- [x] Preserve five CI jobs, current schema, backup files, Windows settings and home services
- [ ] Dev five-job CI GREEN
- [ ] Production PR five-job CI GREEN
- [ ] Independent main push five-job CI GREEN
- [ ] On-server Windows task install/failover acceptance (not authorized or inferred)

See docs/BUILD_062_MANAGED_ENROLLMENT_OBSERVABILITY.md. Next: Build 063 — Release Health Cohorts & Supervised Recovery Evidence.


## Build 063 — Release Health Cohorts & Supervised Recovery Evidence

- [x] Manual-refresh, bounded last-seven-day daily outcome cohorts from local adoption log
- [x] Privacy-safe time/status parser: no raw logs or false SHA attribution
- [x] Detect truncated/malformed history and display partial evidence instead of invented success rates
- [x] Private optional six-gate supervised recovery operator self-attestation for distinct same-schema releases
- [x] Explicit self-report labeling: never machine verified and never auto-enroll Windows Scheduled Tasks
- [x] Owner/admin System page integration and synthetic backend/frontend regression checks
- [x] Operator guide with false-by-default example; no secrets, data migration, runtime restart, VM or device writes
- [ ] dev CI five jobs GREEN
- [ ] production pull-request CI five jobs GREEN
- [ ] independent post-merge main push CI five jobs GREEN
- [ ] Actual home Windows failover acceptance (requires separate real-world operator evidence)

See docs/BUILD_063_RELEASE_HEALTH_RECOVERY.md. Next: Build 064 — Release Incident Triage & Recovery Evidence Continuity.


## Build 064 — Release Incident Triage & Recovery Evidence Continuity

- [x] Privacy-safe recurring HOLD/FAILED/ROLLED_BACK aggregation by category/day
- [x] Optional strictly validated operator review ledger; never mark machine verified or automatically close failures
- [x] Owner-only no-store, manual-refresh System release incident display
- [x] Home page specific guidance for Home Assistant, MQTT and empty camera registry observed in screenshot
- [x] Test missing/malformed/private incident data, no writes, and home diagnostics
- [x] No SQL, scheduled-task, backup, camera, MQTT publish or Windows process changes
- [ ] dev CI five jobs GREEN
- [ ] production PR CI five jobs GREEN
- [ ] independent main push five jobs GREEN
- [ ] actual Windows Home Assistant/MQTT/camera and release rollback acceptance (separate operator gate)

See docs/BUILD_064_RELEASE_INCIDENT_TRIAGE.md. Next: Build 065 — Incident Follow-Up Routing & Integration Diagnostics.


## Build 065 — Incident Follow-Up Routing & Integration Diagnostics

- [x] Deterministic operator-role routing for adoption failure, hold and recovery incidents
- [x] Read-only fixed-schema integration statuses for Home Assistant, MQTT, Ollama, Frigate and go2rtc
- [x] Unknown status is never presented as healthy; operator confirmation required for all routes
- [x] Owner/admin release-observability snapshot integrates both advisory sections
- [x] Unit tests for malformed input, privacy and no automatic remediation
- [ ] dev five-job CI GREEN
- [ ] production PR five-job CI GREEN
- [ ] main independent post-merge CI GREEN
- [ ] On-server Home Assistant, MQTT and camera registry diagnostics (requires actual authenticated Windows connection)
- [ ] Actual Windows deployment and runtime health verified

No scheduled-task, credentials, Windows process, backup or device changes are made.
Next proposed: Build 066 — Guided Integration Recovery & Operator Acceptance.


## Build 066 — Guided Integration Recovery & Operator Acceptance

- [x] Fixed, service-specific recovery instructions for Home Assistant, MQTT, Ollama, Frigate and go2rtc
- [x] Optional bounded, private operator acceptance ledger with three explicit checks per service
- [x] Reject malformed, stale, duplicate, symlinked and extra-field evidence; never return private strings
- [x] Display safe guidance and operator reports in owner/admin System view
- [x] Synthetic backend and frontend coverage, with no automatic service/device writes
- [ ] dev CI five jobs GREEN
- [ ] production PR five jobs GREEN
- [ ] independent main push CI five jobs GREEN
- [ ] Real Windows machine acceptance and live integration health separately verified

See docs/BUILD_066_INTEGRATION_RECOVERY.md.
Next: Build 067 — Integration Health Evidence & Safe Remediation Readiness.


## Build 067 — Integration Health Evidence & Safe Remediation Readiness

- [x] Manual, independent read-only Home Assistant/MQTT/Ollama/Frigate/go2rtc status evidence
- [x] Camera registry counts distinguished from physical camera absence
- [x] Tauri-only Restart Hub applications interface, including backend-unavailable recovery screen
- [x] Existing Windows identity-verified backend restart script invoked with fixed arguments
- [x] Desktop self-restart via Tauri, exact opt-in confirmation and duplicate-operation guard
- [x] Native/frontend regression tests and local Windows operator guide
- [ ] Dev CI 5/5 GREEN
- [ ] Production PR CI 5/5 GREEN
- [ ] Independent main CI 5/5 GREEN
- [ ] Actual Windows server and desktop restart/reconnect acceptance

See docs/BUILD_067_INTEGRATION_HEALTH_RESTART.md.
Next: Build 068 — Supervised Restart Acceptance & Runtime Recovery Evidence.


## Build 068 — Supervised Runtime Recovery & Home Assistant / MQTT Evidence

- [x] Privacy-safe, fixed HA/MQTT failure categories from existing status requests
- [x] Distinguish HA timeout/unauthorized/unreachable and broker rejected credentials
- [x] Specific Home dashboard and on-demand System operator guidance
- [x] No new writes, broker publications, service restarts, VM changes or database migration
- [x] Regression tests for classification and redaction
- [x] Non-disruptive Windows operator acceptance runbook
- [ ] dev CI (5/5)
- [ ] Production PR CI (5/5)
- [ ] Independent main CI (5/5)
- [ ] Household Windows HA/MQTT connectivity verified by operator

See docs/BUILD_068_HA_MQTT_RECOVERY.md.
Next: Build 069 — Integration Recovery Acceptance & Runtime Reconnect Validation.


## Build 069 — Integration Recovery Acceptance & Runtime Reconnect Validation

- [x] MQTT reconnect generation and timestamps from existing Paho callbacks only
- [x] Read-only MQTT status response carries bounded reconnect metadata
- [x] Manual baseline and recheck of HA API/entity count and MQTT broker/subscription count
- [x] Distinguish steady connected, real observed recovery, counter reset and failure
- [x] No service restarts, MQTT publishes, automatic subscriptions or polling
- [x] Regression tests cover secrecy, no automatic requests, and callback transitions
- [ ] dev workflow all five GREEN
- [ ] PR workflow all five GREEN
- [ ] Independent main workflow all five GREEN
- [ ] Two manually observed samples on the household Windows installation

See docs/BUILD_069_INTEGRATION_RECONNECT_ACCEPTANCE.md.
Next queued Build 070 — Camera Inventory Discovery & Safe Registration Acceptance.


## Build 070 — Camera Inventory Discovery & Safe Registration Acceptance

- [x] Bounded owner-only ONVIF discovery preview with no registry changes
- [x] Short-lived one-time owner-bound ticket and exact selected acceptance
- [x] Validated private/local ONVIF URLs, no credential-bearing candidates
- [x] Preserve existing cameras/streams; register new cameras disabled
- [x] Client scan → review → explicitly select → register safe flow
- [x] Backend/frontend authorization, anti-replay and no-auto-write regression tests
- [x] Windows operator acceptance and no-disruption documentation
- [ ] dev five CI checks GREEN
- [ ] PR five CI checks GREEN
- [ ] Independent main five CI checks GREEN
- [ ] Household camera discovery, registrations and streams field-verified

See docs/BUILD_070_CAMERA_ACCEPTANCE.md.
Next queued Build 071 — Camera Transport Configuration & Verified Stream Acceptance.


## Build 081 — Deferred Reboot Acceptance & Private Gateway Continuity Diagnostics
- [x] Pure fail-closed evidence evaluator and privacy-safe read-only PowerShell diagnostic
- [x] Windows syntax/security and synthetic pass/fail evidence test cases
- [x] Operator runbook; no reboot required for development
- [ ] Dev PR and independent dev push five-lane CI GREEN
- [ ] Main PR and independent main push five-lane CI GREEN
- [ ] Actual Windows server acceptance using exact promoted commit
- [ ] Deferred supervised reboot acceptance (operator explicitly unavailable now)

Reboot acceptance stays pending even when all code CI and read-only runtime checks pass.
See docs/BUILD_081_DEFERRED_REBOOT_ACCEPTANCE.md.


## Build 082 — Gateway Task Identity Reconciliation & Diagnostic Accuracy
- [x] Fail-closed identity reason codes without leaking Windows principal or paths
- [x] Same-SID account identity check, exact task action and arguments remain required
- [x] Resolve reserved PowerShell HOME variable bug in old LAN read-only inspector
- [x] Windows CI synthetic identity failures, PowerShell parsing and no-mutation tests
- [x] Operator runbook with no-reboot diagnostics and rollback
- [ ] Development PR and independent dev push 5/5 GREEN
- [ ] Production PR and independent main push 5/5 GREEN
- [ ] Actual Windows server TaskOwned reconciliation (operator-run)
- [ ] Supervised Windows server reboot acceptance (owner-deferred)

See docs/BUILD_082_GATEWAY_TASK_IDENTITY.md. Next proposed: Build 083 — scope to be confirmed.


## Build 083 — Context-Aware Daily Operations Action Queue
- [x] Manual Home/Workshop/Business advisory queue using existing read-only status snapshots
- [x] Prioritise configured failures, unverified reads, and optional setup without false-ready
- [x] Fixed known navigation targets and text; no private provider messages or credentials echoed
- [x] No device/business write, persistence, polling, migration or new service
- [x] Vitest action order, scoped queue, all-ready and privacy regression cases
- [x] Runbook with owner browser acceptance and deferred server reboot boundary
- [ ] Development PR CI 5/5 and independent dev push 5/5
- [ ] Production PR CI 5/5 and independent main push 5/5
- [ ] Owner browser review on current Windows deployment
- [ ] Supervised Windows server reboot (still deferred independently)

See docs/BUILD_083_DAILY_ACTION_QUEUE.md.
Next proposed: Build 084 — scope to be confirmed.


## Build 084 — Manual Follow-Up Review & Snapshot Revalidation
- [x] Session-only acknowledgement and reopening per known status key
- [x] Review counts distinguish manually inspected from verified or repaired
- [x] Successful refresh clears all acknowledgements across contexts
- [x] No backend, device, camera, MQTT, business, task scheduler or database writes
- [x] React interaction test: mark, reopen, context switch, refresh and privacy redaction
- [x] Operator runbook, rollback, safety boundary, and separate reboot gate
- [ ] Development PR and independent dev push CI 5/5 GREEN
- [ ] Main PR and independent main push CI 5/5 GREEN
- [ ] Actual operator browser acceptance on current Hub PWA (separate from CI)
- [ ] Supervised server reboot recovery (owner-deferred from Build 081)

See docs/BUILD_084_FOLLOW_UP_REVIEW.md. Next proposed Build 085 (scope to be confirmed).


## Build 085 — Snapshot Change Detection & Reverification Guidance
- [x] Two manual status snapshot comparison, session-only and without new backend endpoints
- [x] Separate newly reported attention, lost verification, other changes and ready reports
- [x] Static privacy-safe guidance, known navigation targets and per-context filtering
- [x] No safety, repaired-device, server reboot, camera or client HTTPS acceptance inferred
- [x] Unit and React interaction regression tests for ranking, privacy and refresh behavior
- [x] Operator runbook, rollback and no-migration security scope
- [ ] Development PR and independent dev push CI 5/5 GREEN
- [ ] Production PR and independent main push CI 5/5 GREEN
- [ ] Live Windows PWA assets/adoption and browser acceptance (separate)
- [ ] Supervised server reboot recovery (owner-deferred)

See docs/BUILD_085_SNAPSHOT_CHANGE_REVIEW.md. Next proposed: Build 086 — scope to be confirmed.


## Build 086 — Privacy-Safe Manual Operations Handoff
- [x] Frontend-only, deliberate show/hide of fixed-category context handoff summary
- [x] Include current/previous sample time, safe reported service states, manual follow-ups and change categories
- [x] Preserve reviewed-not-resolved, verification and deferred-server-reboot safety boundaries
- [x] No raw backend errors, URLs, provider identities, IPs, tokens, passwords, customer data or unknown keys
- [x] Unit and React UI tests for privacy, no-baseline, context switching, refresh reset and manual disclosure
- [x] Operator runbook, no-migration rollback and live PWA adoption check
- [ ] Development PR and independent dev push all five CI lanes GREEN
- [ ] Production PR and independent main push all five CI lanes GREEN
- [ ] Browser acceptance of the current built Windows PWA (separate owner action)
- [ ] Actual supervised Windows server reboot (owner-deferred)

See docs/BUILD_086_PRIVATE_OPERATIONS_HANDOFF.md. Next proposed Build 087 — scope to be confirmed.


## Build 105 — Reboot Recovery Dependency Ordering & Database Readiness
- [x] Document the actual October 21 supervised Windows reboot and database-schema HOLD
- [x] Add pre-reboot read-only schema compatibility inspector (never auto-migrate)
- [x] Log bounded, non-secret schema-mismatch HOLD before the recovery task exits
- [x] Dependency-order a guarded retry of the existing, owner-verified gateway task after API/built PWA readiness
- [x] Preserve client access, firewall, TLS, task ownership, migration and unrelated service safety boundaries
- [x] Add Windows pure-decision regression cases and operator release/runbook
- [x] Independent dev push and main push CI fully GREEN (main run 39722718267, 5/5)
- [ ] Operator installs updated source on the actual Windows test server and completes a *new* supervised reboot acceptance

See docs/BUILD_105_REBOOT_RECOVERY_DEPENDENCY_ORDERING.md. Next proposed: Build 106 — Home Assistant VM & MQTT Post-Reboot Dependency Acceptance.

## Build 106 — Home Assistant VM & MQTT Post-Reboot Dependency Acceptance
- [x] Record observed EFI/VM, HA port 80, Mosquitto port 1883 and recovered authenticated Hub statuses
- [x] Separate configured versus discovered Home Assistant devices and independent camera inventory
- [x] Add read-only Windows VirtualBox/HA/MQTT dependency inspector with fixed private classifications
- [x] Pure six-prerequisite verdict, no-host-mutation Windows regression and operator runbook
- [x] Independent `dev` pull-request and post-merge push five CI jobs GREEN (PR #277)
- [x] Independent `main` pull-request and post-merge push five CI jobs GREEN (PR #170, main run 39722718267)
- [ ] Owner runs Build 106 on installed Windows checkout and confirms actual VM boot and authenticated integrations
- [ ] Device/camera inventory reconciliation and live authorized camera playback accepted independently

See docs/BUILD_106_HA_MQTT_POST_REBOOT_ACCEPTANCE.md. Next queued: Build 107 — Device Inventory & Camera Recovery.

## Build 107 — Device Inventory & Camera Recovery
- [x] Independent, read-only Home Assistant browser, Hub camera registry and camera transport evidence in Devices
- [x] Failed or incomplete reads report UNKNOWN, never a misleading zero-camera/device conclusion
- [x] Operator-only identity snapshot download/import and stable-ID missing/new comparison
- [x] No tokens, URLs, stream credentials, Home Assistant attributes or camera hosts in snapshots
- [x] Clear integration discovery and bulk-reviewed ONVIF recovery paths; no automatic changes
- [x] Pure snapshot validation and React error/zero/mutation regression tests
- [x] Independent `dev` PR and post-merge push CI GREEN (PR #278, dev run 39781149367)
- [x] Independent `main` PR and post-merge push CI GREEN (PR #279, main run 39781822923)
- [ ] Owner captures/imports actual private baseline and reviews recovered devices and cameras on installed Windows server
- [ ] Independent authorized camera playback and HA integration acceptance on physical equipment

See docs/BUILD_107_DEVICE_CAMERA_RECOVERY.md. Next proposed: Build 108 — Supervised Device & Camera Field Reconciliation.

## Build 108 — Supervised Device & Camera Field Reconciliation
- [x] Independent missing HA device, HA entity and Hub camera identity owner dispositions; no automatic enrollment or deletion
- [x] Fresh safe go2rtc/stream gate before explicit per-camera moving-video operator acknowledgement
- [x] Session-only review and playback marks reset whenever evidence refreshes or baseline changes
- [x] Private field-review JSON handoff with identity/provenance, action classifications and playback observations, no hosts or secrets
- [x] Pure logic and React regression tests include failed reads and no automatic write actions
- [x] Independent `dev` pull request and post-merge push CI GREEN (PR #280, dev run 39789112114)
- [x] Independent `main` pull request and post-merge push CI GREEN (PR #281, main run 39790001617)
- [ ] Owner imports actual pre-incident baseline and reconciles missing household devices on Windows VM
- [ ] Owner verifies each selected actual live camera feed, recording field acceptance separately from CI

See docs/BUILD_108_SUPERVISED_DEVICE_CAMERA_FIELD_RECONCILIATION.md. Next queued: Build 109 — Device & Camera Recovery Receipt Reconciliation & Owner Acceptance.

## Build 109 — Device & Camera Recovery Receipt Reconciliation & Owner Acceptance
- [x] Strict, allowlisted Build 108 review receipt parser rejects malformed, oversized, contradictory and duplicate evidence
- [x] Follow-up only against a later exact-ID snapshot, preserving renamed/retired/absent ambiguity
- [x] No inherited live playback acceptance; gated fresh stream evidence and owner-observed moving-video marks
- [x] Session-only owner acceptance marks invalidated on registry snapshot changes; no network writes
- [x] Private receipt export distinguishes reappeared identity, retired exception, unverified stream and unresolved holds
- [x] Pure logic and React regression tests plus operator runbook
- [x] Independent `dev` feature PR and post-merge push CI GREEN (PR #282, dev run 39796632408)
- [x] Independent `main` promotion PR and post-merge push CI GREEN (PR #283, main run 39798822217, protected `main` `bfd559eb73ed766b60773dc2bf6602fa2ecd552b`)
- [ ] Actual owner-exported Build 108 receipt imported and verified against later Windows HA/camera evidence
- [ ] Physical device function and camera playback accepted independently by owner on actual equipment

See docs/BUILD_109_DEVICE_CAMERA_RECOVERY_RECEIPT_OWNER_ACCEPTANCE.md. Next queued: Build 110 — Integration-Level Missing Device Evidence & Camera Recovery Follow-Up Queue.

## Build 110 — Integration-Level Missing Device Evidence & Camera Recovery Follow-Up Queue
- [x] Strict allowlisted Build 109 private owner receipt import, duplicate/contradiction/timestamp/summary validation
- [x] Exact-ID missing HA and camera reconciliation against a strictly later, five-minute-fresh inventory reading
- [x] Owner-only batch grouping of unresolved HA cases by named integration with explicit unknown defaults
- [x] Previously accepted HA retirement remains a supervised exception and reappearance is reopened for review
- [x] Camera discovery/registration, private stream health and current moving-video reviews remain distinct holds
- [x] Session-only owner function and playback observations invalidate after inventory refresh; no network writes
- [x] Private identity-only unresolved follow-up queue export with no URLs or credentials
- [x] Pure logic, React unit/integration tests and Windows operator runbook
- [x] Independent `dev` feature PR and push CI GREEN (PR #284, dev run 39836838491)
- [x] Independent `main` promotion PR and push CI GREEN (PR #285, main run 39837924187, protected `main` `aad5446200bfd2e8b26aace5c6804f593343b7b0`)
- [ ] Owner imports actual Build 109 packet and reviews HA integration/device cases against Windows field evidence
- [ ] Owner supervises real camera registration, safe stream configuration and moving live-video acceptance

See docs/BUILD_110_INTEGRATION_DEVICE_CAMERA_FOLLOW_UP_QUEUE.md. Next queued: Build 111 — Owner-Supervised Integration Follow-Up Closure & Camera Playback Recheck Ledger.

## Build 111 — Owner-Supervised Integration Follow-Up Closure & Camera Playback Recheck Ledger
- [x] Strict Build 110 private queue importer with exact identities, stage/source, time, counts, size and group checks
- [x] Fresh and strictly later Home Assistant/camera snapshot against worklist and preceding owner ledger review
- [x] Explicit owner function check, intentional retirement and observed moving-video closure actions; unhealthy/absent cameras always held
- [x] Private append-only bounded closure-ledger import/export with reopened identity decisions and prior history
- [x] Session-only owner marks invalidate on new inventory readings; imported old closures cannot certify new readings
- [x] Read-only UI, no secrets/URLs, automated device calls, camera registration, persistent database or Windows task changes
- [x] Pure and React regression tests, type-check, web build and owner runbook
- [x] Independent `dev` feature PR and post-merge push CI GREEN (PR #286, dev run 39881315349)
- [x] Independent `main` promotion PR and post-merge push CI GREEN (PR #287, main run 39882265832, protected `main` `8760d3a530d2a0ebdc98f83bf8df639e31d90d1d`)
- [ ] Owner imports actual Build 110 worklist on Windows Hub and reviews physical HA device/integration cases
- [ ] Owner separately watches live moving video and confirms camera acceptance on actual equipment

See docs/BUILD_111_OWNER_SUPERVISED_FOLLOW_UP_CLOSURE_LEDGER.md. Next proposed: Build 112 — Supervised Field Recheck Drift & Evidence Chain Handoff.

## Build 112 — Supervised Field Recheck Drift & Evidence Chain Handoff
- [x] Strict, private Build 110 worklist plus Build 111 closure ledger import with exact provenance
- [x] Compare last two owner reviews, keeping first review as baseline without false drift claims
- [x] Per-identity reopened, still-open, newly-closed, rechecked-closed and stage-change classifications
- [x] Separate HA and camera unresolved holds; preserve historical owner evidence chain with chronological timestamps
- [x] Session-only handoff acknowledgment distinct from HA function and live camera playback verification
- [x] Identity-only, manually downloaded private handoff with supervised next steps and no secrets or remote writes
- [x] Pure unit/React regression tests, owner runbook, web type-check and production bundle
- [x] Independent `dev` feature PR and post-merge push CI GREEN (PR #288, dev run 39891921827)
- [x] Independent `main` promotion PR and post-merge push CI GREEN (PR #289, main run 39892570091, protected `main` `ce051f6ce11f43df21853d0835106c0c28defc16`)
- [ ] Owner imports actual Build 110/111 private receipts on installed Windows Hub and reviews the follow-up chain
- [ ] Owner separately verifies real HA functions and moving camera video before physical recovery acceptance

See docs/BUILD_112_SUPERVISED_DRIFT_EVIDENCE_CHAIN_HANDOFF.md. Next queued: Build 113 — Installed Windows Hub Version & Field Evidence Adoption.

## Build 113 — Installed Windows Hub Version & Field Evidence Adoption
- [x] Build-time web SHA and tracked checkout cleanliness, with explicit unknown/dirty cases
- [x] Owner-only System workbench with manually supplied protected-main commit and workflow references
- [x] Read-only, on-demand existing local release pointer and running backend package version comparison
- [x] Distinguish CI/package success, updater adoption pointer, loaded frontend and unverifiable running process
- [x] Optional Build 112 handoff import retaining only bounded unresolved HA/camera counts and source timestamps
- [x] Session-only owner Windows/PWA checks, private metadata-only FIELD ADOPTION HOLD receipt, no automatic action
- [x] Web TypeScript, 201/201 tests, production bundle and independent repository CI GREEN
- [x] Independent `dev` feature PR and post-merge push CI GREEN (PR #290, dev run 39904124230)
- [x] Independent `main` promotion PR and post-merge push CI GREEN (PR #291, main run 39904714823; SHA `8d7fcca68f3732b3cc8cdbe90581c60ae59b1b84`)
- [ ] Owner checks actual installed Windows API, browser/PWA version, HA devices and moving camera video

See docs/BUILD_113_INSTALLED_WINDOWS_VERSION_FIELD_ADOPTION.md. Next queued: Build 114 — Home Assistant Integration Discovery & Missing Device Diagnosis.

## Build 114 — Home Assistant Integration Discovery & Missing Device Diagnosis
- [x] Owner-only read-only HA discovery workbench with explicit refresh of the existing authenticated registry browser
- [x] Strict Build 107 inventory or Build 110 follow-up import; cameras excluded; owner-supplied integration labels remain unverified hints
- [x] Exact identity diagnostic classification, live entity platform hints, separate missing/unavailable/reported states
- [x] Batch owner-confirmed HA grouping and integration-level owner observations without automatically repairing or enrolling devices
- [x] Fresh later HA reading and real owner physical function review required before a session-only identity acknowledgment; marks reset on refresh
- [x] Private minimal HA diagnostic receipt preserving outstanding holds and an unconditional field-acceptance boundary
- [x] Pure logic and React tests, safety/privacy documentation, no additional HA commands or persistent schema changes
- [x] Web TypeScript, 208/208 tests and production bundle verified
- [x] Independent `dev` feature PR and post-merge push CI GREEN (PR #292, dev run 39964780748)
- [x] Independent `main` promotion PR and post-merge push CI GREEN (PR #293, main run 39965918181; SHA `857e3eda70e61ba1f8ffe6ee9e4b1cdcdd4eb94f`)
- [ ] Owner checks actual Home Assistant integrations, physical devices and separate field acceptance on installed Windows Hub

See docs/BUILD_114_HOME_ASSISTANT_INTEGRATION_DISCOVERY.md. Next queued: Build 115 — Operator-Reviewed Camera Discovery & Bulk Restore Candidates.

## Build 115 — Operator-Reviewed Camera Discovery & Bulk Restore Candidates
- [x] Accept only strict prior Build 107 inventory or Build 110 follow-up camera identities in browser-session memory; reject oversized, duplicate or URL/secret-bearing identity fields
- [x] Explicit fresh ONVIF preview and authenticated current registry comparison by stable endpoint UUID, bounded model hint and prior name evidence
- [x] Fail closed for network endpoint collisions, ambiguous names, renamed exact IDs, existing registration, drift and unrecognized discoveries
- [x] Per-camera or bulk operator selection plus explicit physical hardware/model attestation; no automatic camera enrollment
- [x] Fresh registry preflight, one-use server ticket, server-side endpoint collision rejection and disabled-only creation; no stream or go2rtc mutation
- [x] Private registration receipt with exact IDs and disabled status; unconditional physical/private-stream/moving-video HOLD
- [x] Document operator runbook and reserve security-gated local household password vault Builds 119–122
- [x] Web TypeScript + 215/215 tests, production bundle; 11/11 camera API and 3/3 ticket tests; Python lint
- [ ] Independent feature PR and post-merge `dev` CI GREEN
- [ ] Independent promotion PR and post-merge `main` CI GREEN
- [ ] Owner checks actual installed Windows Hub, camera physical models, private streams and moving video

See docs/BUILD_115_CAMERA_DISCOVERY_BULK_RESTORE.md. Next queued: Build 116 — Private Camera Stream Health & Playback Acceptance.
