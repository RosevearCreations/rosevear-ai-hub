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
| 024 | Natural-Language Home Tools | READY FOR CI | dev |

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
- [ ] final Build 024 dev CI green
- [ ] promoted to main
- [ ] final Build 024 main CI green
- [ ] dev synchronized with main

## Operator setup

No new credential is required. Keep the Build 021 Home Assistant connection and Build 023 safe
control allow list. Select the **Home** chat profile and use explicit commands naming one exact
allow-listed entity.

## Next build

**Build 025 — MQTT Foundation**
