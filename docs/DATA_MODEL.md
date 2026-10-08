# Data Model

Initial persistence target: SQLite.

## users
- id
- username
- password_hash
- role
- enabled
- created_at
- updated_at

## sessions
- id
- user_id
- token_hash
- created_at
- expires_at
- revoked_at

Build 016 stores only a SHA-256 hash of each opaque session token. Raw session tokens are never persisted. Sessions are revoked on logout and expire according to the configured local session lifetime.

## conversations
- id
- user_id
- title
- profile_id
- provider
- model
- created_at
- updated_at

## chat_messages
- id
- conversation_id
- role
- content
- provider
- model
- status
- created_at

## model_profiles
- id
- slug
- name
- system_prompt
- preferred_provider
- preferred_model
- privacy_policy
- enabled
- built_in
- created_at
- updated_at

Build 008 seeds five built-in local-only profiles:
- General
- Coding
- Home
- Workshop
- Business

## knowledge_collections
- id
- name
- description
- local_only
- created_at

Build 011 seeds a local-only `Inbox` collection. Collection administration arrives in Build 015.

## documents
- id
- collection_id
- filename
- content_hash
- mime_type
- source_path
- size_bytes
- extracted_text
- metadata_json
- status
- created_at
- indexed_at

Build 011 stores originals using a SHA-256 content-addressed path under the local knowledge storage directory. `content_hash` is unique and is the duplicate-detection key. `source_path` is relative to the configured knowledge root rather than an absolute host path.

`metadata_json` stores format-specific ingestion metadata such as page count, extracted character count, DOCX paragraph/table counts, and whether PDF text was available.

## document_chunks
- id
- document_id
- ordinal
- text
- start_char
- end_char
- citation_metadata
- embedding_reference
- created_at

Build 012 chunks extracted document text deterministically using configurable character windows and overlap. Character offsets are retained for later citation work.

## chunk_embeddings
- id
- chunk_id
- provider
- model
- dimensions
- vector_json
- created_at

Build 012 stores embeddings behind a vector-store abstraction. The initial SQLite deployment uses JSON vectors through SQLAlchemy and stores a stable embedding reference on each chunk. This can later be replaced by pgvector or another vector backend without changing the document/chunk API.

## integrations
- id
- integration_key
- type
- name
- enabled
- configuration_reference
- last_health_status
- last_health_at
- created_at
- updated_at

Build 017 introduces integration metadata as the stable ownership layer for registered tools. Core
registries use stable keys such as `core.knowledge`; later Home Assistant, MQTT, camera, and
business connectors can reuse the same ownership model without making the Hub their system of
record.

## tools
- id
- integration_id
- tool_key
- display_name
- description
- capabilities_json
- risk_level
- input_schema_json
- output_schema_json
- enabled
- built_in
- created_at
- updated_at

Build 017 makes the tool registry contract explicit. `tool_key` is a stable dotted identifier.
Capabilities are normalized strings, risk levels use the canonical 0–3 policy, and input/output
contracts are stored as JSON-compatible object schemas with undeclared top-level properties
rejected. Code-owned metadata may be synchronized while the operator-controlled enabled state is
preserved.

## confirmation_requests
- id
- requested_by_user_id
- decided_by_user_id
- tool_id
- tool_key
- risk_level
- arguments_json
- arguments_hash
- preview_json
- status
- expires_at
- decided_at
- consumed_at
- created_at
- updated_at

Build 018 persists exact-action confirmation requests. The server validates arguments against the
registered tool schema, stores canonical arguments plus a SHA-256 fingerprint, generates the
preview server-side, and tracks the lifecycle through pending, approved, rejected, expired, and
consumed states. A successful action atomically changes an approved request to consumed in the same
transaction as the protected database mutation, preventing replay.

## automations
- id
- name
- enabled
- definition_json
- created_by
- created_at
- updated_at

Build 026 makes the `automations` record real. `definition_json` contains strict Rule Schema v1: one trigger, zero or more conditions, one or more Level 0/1 tool actions, cooldown metadata, and optional deduplication metadata. Rule execution is activated by Build 027; each matched execution or protected skip can create persistent run evidence.

## automation_runs
- id
- automation_id
- started_at
- completed_at
- status
- result_summary

Build 027 creates this table. Build 029 formalizes `status` as `running`, `success`, `failed`,
`skipped`, or `interrupted`. `result_summary` is bounded structured evidence containing source
metadata, action counts, skip/failure reason, and an optional deduplication token. MQTT payload
plaintext is not stored in run evidence; only its SHA-256 fingerprint is retained.

Build 029 adds no schema columns. It treats `interrupted` as restart-recovery evidence for a row
that was still `running` when the prior process stopped. Failed/interrupted summaries include
failure classification and `automatic_retry=false`; the same table powers the bounded history and
summary APIs.

## audit_events
- id
- actor_user_id
- event_type
- object_type
- object_id
- action
- tool_key
- risk_level
- confirmation_id
- sanitized_arguments
- result
- result_status
- created_at

Build 019 adds first-class tool, risk, confirmation, and result-status fields so audit records can
be filtered efficiently without parsing JSON payloads. Existing Build 016–018 audit rows are
backfilled when those values can be derived. New state-changing paths use the central audit writer,
which sanitizes and bounds arguments/results before persistence.

## secret_values
- id
- secret_key
- ciphertext
- key_fingerprint
- rotated_at
- created_at
- updated_at

Build 020 stores only authenticated ciphertext for persisted credentials. The database does not
contain the encryption master key or plaintext values. `key_fingerprint` is a non-secret SHA-256
fingerprint prefix used to identify which configured master key wrapped a row. Environment-backed
secrets are not copied into this table and take precedence when both sources are configured.

## camera_registry
- id
- name
- integration_id
- protocol
- host_reference
- capabilities_json
- enabled
- last_health_at

## design rule

Business-domain entities are not copied into the Hub as authoritative records. Store references/cache metadata only when necessary.

## provider routing note

Build 009 persists the stable provider key on conversations and assistant messages. User-authored messages keep provider null. Existing conversations migrate to `ollama`.


## Build 023 safe-control policy

No new table is required. The exact Home Assistant entity allow list is stored in the existing
app_settings table under key home_assistant.safe_control_allowlist as a JSON array of entity IDs.
The Hub does not duplicate Home Assistant entity state into a new authority.


## Build 028 authoring data handling

Build 028 adds no table or column. AI-generated automation drafts are transient API responses and are
not stored in SQLite. Only after an Owner/Administrator completes the existing exact Level-2
confirmation flow does the rule enter the Build 026 `automations` table. Authoring audit records
store provider/model identifiers, bounded character counts, validation outcome, referenced tool keys,
and warning counts; they intentionally do not store the natural-language prompt or raw model output.
