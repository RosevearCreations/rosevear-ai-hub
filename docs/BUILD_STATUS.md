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

## Next build

**Build 029 — Automation History and Failure Handling**
