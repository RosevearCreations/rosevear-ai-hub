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
| 040 | Narrow Confirmed Business Writes | ACTIVE | dev feature branch |

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
