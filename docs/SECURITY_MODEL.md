# Security Model

## Threat assumptions

The Hub handles private data and can affect physical devices. Assume:
- web/document content may contain prompt injection
- LLM output can be incorrect
- local IoT devices can be compromised
- secrets can leak through careless logging
- users can accidentally issue harmful commands
- network services can be misconfigured

## Network controls
- no public port forwarding
- trusted LAN/localhost bindings by default
- Tailscale or equivalent for remote access
- firewall unused ports
- separate IoT/camera VLAN recommended later
- do not expose Ollama or MQTT anonymously

## Authentication
- local passwords are hashed with Argon2
- raw session tokens are never persisted; only SHA-256 token hashes are stored
- session cookies are HTTP-only and SameSite=Strict
- session expiration and explicit logout revocation are enforced
- the one-time owner bootstrap is available only while no configured account exists
- at least one enabled owner must remain
- administrators cannot manage privileged owner/administrator accounts
- application APIs require a valid server-side session after bootstrap
- admin-only integration configuration
- server-side authorization on every protected route
- optional MFA later

## Secrets
- never commit .env
- never log raw passwords
- redact bearer tokens/API keys
- never redisplay full saved secrets
- support rotation

## Secret management

Build 020 makes secret handling a dedicated security boundary:
- environment-backed secrets remain outside SQLite
- environment values take precedence over encrypted stored copies
- persisted secret values use AES-GCM authenticated encryption
- the 256-bit master key is supplied separately through `SECRET_ENCRYPTION_KEY`
- the master key is never persisted in the Hub database
- ciphertext uses a fresh random nonce and binds the stable secret key as authenticated data
- Owner/Administrator accounts may administer secrets; lower roles cannot
- saved secret plaintext is never returned through the API or UI
- configuration objects use secret-aware Pydantic fields so values are redacted from representations
- secret administration audit records contain identity/operation metadata, not submitted plaintext
- `SECRET_ENCRYPTION_PREVIOUS_KEY` is accepted only as a temporary rotation aid
- master-key rotation rewraps stored ciphertext under the new current key before the previous key is removed

Encrypted-at-rest storage protects database copies, but it does not protect against a fully
compromised process that already has access to the live master key. Host account security,
filesystem permissions, process isolation, and backups remain part of the trust boundary.

## Knowledge-file ingestion

Uploaded knowledge files are untrusted input.

Build 011 therefore:
- accepts only PDF, TXT, Markdown, and DOCX
- normalizes filenames and never trusts client paths
- limits upload size before full processing
- validates PDF/DOCX structure
- rejects encrypted PDFs
- limits expanded DOCX archive size
- never executes macros or embedded programs
- stores originals under content-addressed local paths
- exposes relative storage paths rather than absolute host paths
- uses SHA-256 duplicate detection

A successful parse means only that the file could be read. It does **not** make the document trustworthy.

## Prompt injection

Retrieved content is untrusted data.

Content found in a document, camera metadata, webpage, or business record must never be allowed to:
- reveal secrets
- change roles/permissions
- execute tools by itself
- override system policy
- bypass confirmation

## Tool registry

Build 017 establishes the permission boundary before tool execution exists:
- every registered tool declares a stable key, capabilities, normalized input/output schemas, and risk level
- risk levels map directly to the canonical Level 0–3 policy
- Level 2 tools carry a mandatory-confirmation policy for the Build 018 execution layer
- Level 3 tools cannot be enabled for autonomous execution
- only Owner/Administrator accounts may change tool enable state
- Household and Read-only users may inspect registry metadata but cannot administer it
- registry enable/disable changes are audit-recorded
- the registry itself cannot execute tools

Tool arguments supplied by an LLM remain untrusted input. Future execution code must validate
arguments against the registered schema, authorization, risk policy, and confirmation evidence
before calling an implementation.

## Confirmation workflow

Build 018 enforces Level 2 confirmation on the server:
- registered input schemas validate untrusted tool arguments before a request is created
- the server builds the exact action preview from the registered tool plus canonical arguments
- canonical arguments are SHA-256 fingerprinted and must match again at consumption
- only Owner/Administrator accounts may approve or reject Level 2 requests
- confirmations expire; the default lifetime is five minutes
- expired decisions/consumption return HTTP 410
- successful approvals are consumed atomically and cannot be replayed
- the approval and protected database mutation share one transaction
- Level 3 tools cannot enter the confirmation workflow
- disabled tools cannot create confirmation requests
- no reusable approval token or secret is exposed to the browser

Knowledge-document deletion is the first enforced Level 2 consumer. Direct deletion without an
approved matching confirmation returns HTTP 428.

## High-risk physical actions

The AI must not autonomously:
- unlock exterior doors
- disarm security
- disable smoke/CO detection
- disable critical cameras
- energize forge/kiln/heaters/laser/CNC or similar hazardous equipment
- make purchases

Future support for such equipment requires dedicated non-AI interlocks.

## Audit

Build 019 centralizes persistent audit recording for current state-changing Hub paths.

Audit records include:
- actor, when a human actor exists
- event and requested action
- object identity
- tool key, when applicable
- risk level, when applicable
- confirmation evidence, when applicable
- sanitized inputs
- sanitized result and filterable result status
- timestamp

Only Owner/Administrator accounts may inspect the Audit Log.

The audit sanitizer redacts common password, secret, API-key, token, authorization, cookie,
credential, and private-key fields before persistence. Bearer/Basic authorization-looking string
values are also redacted, and oversized/deep payloads are bounded.

Audit records are append-only through the application API. Build 019 does not silently delete
records. The operational retention target remains 180 days; automated pruning is deferred until
backup/retention operations are explicitly defined.

## Backups
- daily DB backup
- encrypted off-machine copy
- regular restore test
- knowledge source documents backed up separately where appropriate


## Home Assistant connection

Build 021 keeps Home Assistant access read-only and server-side:
- the long-lived token is resolved through Build 020 and is never returned to the browser
- Authorization headers are constructed only inside the backend adapter
- token values are excluded from connector error messages
- the configured URL must use HTTP or HTTPS and contain a valid host
- missing configuration and network outages degrade to status information rather than disabling the Hub
- the entity inventory exposes a bounded normalized subset instead of forwarding arbitrary Home Assistant attributes
- no Home Assistant service-call endpoint or device-control tool exists in Build 021
- the Hub and Home Assistant must remain on trusted local/private networking; no public port forwarding is introduced


## Home Assistant entity browser

Build 022 expands read access without expanding write authority:
- registry discovery uses authenticated Home Assistant WebSocket commands only for area, device, and entity lists
- live state remains read through the REST API
- no Home Assistant service call or state-changing WebSocket command is exposed
- entity attributes are bounded before response serialization
- secret-like attribute keys are redacted before data leaves the backend
- entity area assignment prefers the entity registry and falls back to the owning device area
- Build 020 secret writes remain Owner/Administrator-only; the CORS PUT fix changes browser transport permission only, not application authorization


## Home Assistant safe device controls

Build 023 introduces bounded Level-1 Home Assistant writes:
- only light, switch, and scene domains are eligible
- exact entity IDs must be placed on an Owner/Administrator-managed allow list
- allow-list mutation is an administrative path, not an AI tool
- allow-list changes are audited at Level 3 because they alter which future writes may be delegated
- light and switch actions are limited to on/off
- scene actions are limited to activation and must be manually classified as non-safety
- hazardous/safety-looking targets are rejected even if persisted policy data is stale
- Household Users may use allow-listed Level-1 controls
- Read-only users cannot execute writes
- Home Assistant outages block writes
- arbitrary Home Assistant service calls are not exposed
- each attempted execution passes the registered tool schema and enable-state gate
- successful and failed executions are audit-recorded

Build 023 does not relax the canonical Level-3 prohibitions for locks, alarm/security changes,
life-safety devices, hazardous workshop equipment, purchases, or security bypasses.


## Build 024 natural-language home tools

Natural-language home control is deterministic rather than model-directed:
- only the Home profile enters the command resolver
- only explicit single-target Level-1 light/switch/scene imperatives are recognized
- exact friendly-name/entity resolution is required for execution
- partial or duplicate names require clarification and do not execute
- bulk commands do not execute
- unsupported actions are not passed to an LLM for interpretation
- the Build 023 exact-entity allow list remains mandatory
- hazardous/safety-sensitive targets remain prohibited
- read-only accounts cannot execute writes
- Home Assistant outages block execution
- the provider never chooses the entity, action, or service call
- Build 023 tool schema, enable-state, role, and audit checks remain authoritative

For recognized exact allow-listed Level-1 commands, the Owner/Admin allow list is the configuration
that permits direct execution and the user's explicit imperative is the exact requested action.
Build 018 confirmation remains mandatory for future Level-2 actions and is not bypassed by this
resolver.


## MQTT foundation

Build 025 treats MQTT as a private authenticated integration boundary:
- anonymous broker access is not used; host, username, password, and an allow list are all required
- the password is resolved through Build 020 and is never returned to the browser
- the browser talks only to FastAPI and never opens a broker connection
- publish topics cannot contain MQTT wildcards
- wildcard subscriptions cannot broaden access beyond an explicitly configured allow-list filter
- concrete topics are matched against configured MQTT filters before publish or subscription
- retained publishes are blocked to avoid creating persistent broker-side commands
- publish payload size is bounded and audit evidence stores only length/hash, not plaintext
- reconnect uses bounded delay and restores only previously authorized subscriptions
- recent received messages are bounded in memory and are not written to the audit log by default
- MQTT is not exposed as an AI tool or automation action in this build

When `MQTT_TLS=false`, broker credentials are not protected from a compromised local network path.
Use a trusted private LAN/VLAN or enable a broker TLS listener with a certificate trusted by the Hub
host. Never expose the MQTT listener directly to the public internet.


## Build 026 automation rule boundary

Automation definitions are untrusted structured input. Rule Schema v1 rejects unknown fields and
bounds condition/action counts, cooldown values, entity identifiers, MQTT topic filters, and
deduplication keys before persistence.

Only Owner/Administrator accounts can request or apply rule changes. Every create, update, or delete
is a Level 2 change and consumes one exact Build 018 confirmation. Update/delete confirmations bind a
SHA-256 fingerprint of the current rule record to prevent a previously approved change from silently
applying after the rule has been edited.

Executable rule actions may reference only registered Level 0 or Level 1 tools. Level 2 and Level 3
tools are rejected from automation definitions, and an enabled rule cannot reference a disabled
tool. Build 026 performs no event subscription and no rule execution.


## Build 027 Event Engine boundary

Build 027 activates deterministic execution without expanding the autonomous-write policy:
- Home Assistant and MQTT credentials remain inside their existing server-side adapters
- live events enter a bounded in-process queue; overload drops are counted rather than allowing
  unbounded memory growth
- only enabled rules are evaluated
- triggers and conditions are evaluated by deterministic code, never by an LLM
- state-threshold rules fire only on a real boundary crossing
- cooldown and deduplication checks are persisted through `automation_runs`
- MQTT run evidence stores a SHA-256 payload fingerprint instead of the raw payload
- every action rechecks the current registered tool, enabled state, risk level, and input schema
- autonomous executors are limited to the Build 023 light/switch/scene Level-1 tool contracts
- the exact Home Assistant safe-control allow list and hazardous-target denial remain authoritative
- Level 2 and Level 3 tools remain unavailable to autonomous rules
- failed/denied actions and final automation outcomes are audit-recorded
- queue or integration failure does not move action selection into an AI fallback

Build 028 may help author structured rules, but it does not change this execution boundary.
