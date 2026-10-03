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
- created_at
- expires_at
- revoked_at

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

## chunks
- id
- document_id
- ordinal
- text
- citation_metadata
- embedding_reference

Build 012 creates and populates chunks/embeddings.

## integrations
- id
- type
- name
- enabled
- configuration_reference
- last_health_status
- last_health_at

## tools
- id
- integration_id
- tool_key
- risk_level
- enabled

## confirmations
- id
- user_id
- requested_action_hash
- expires_at
- approved_at
- rejected_at

## automations
- id
- name
- enabled
- definition_json
- created_by
- created_at
- updated_at

## automation_runs
- id
- automation_id
- started_at
- completed_at
- status
- result_summary

## audit_events
- id
- actor_user_id
- event_type
- object_type
- object_id
- action
- sanitized_arguments
- result
- created_at

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
