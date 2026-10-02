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
- created_at
- updated_at

## messages
- id
- conversation_id
- role
- content
- model_provider
- model_name
- created_at

## model_profiles
- id
- name
- system_prompt
- preferred_provider
- preferred_model
- privacy_policy
- enabled

## knowledge_collections
- id
- name
- description
- local_only
- created_at

## documents
- id
- collection_id
- filename
- content_hash
- mime_type
- source_path
- status
- created_at
- indexed_at

## chunks
- id
- document_id
- ordinal
- text
- citation_metadata
- embedding_reference

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
