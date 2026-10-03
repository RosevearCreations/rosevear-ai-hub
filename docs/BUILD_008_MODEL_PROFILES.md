# Build 008 — Model Profiles

## Scope

Build 008 adds persistent behavior profiles for local AI conversations.

Built-in profiles:
- General
- Coding
- Home
- Workshop
- Business

Each profile stores:
- stable slug and display name
- system instruction
- preferred provider
- optional preferred model
- privacy policy
- enabled state
- built-in marker

## Runtime behavior

A conversation can store one profile ID. When a chat generation begins, the backend resolves the selected enabled profile and prepends its system instruction to the Ollama message list.

The system instruction is not copied into chat history as a user-visible message. The profile ID remains on the conversation so later turns continue using the same behavior unless the user changes it.

## Profile intentions

### General
Clear practical local assistant behavior with uncertainty and action-truthfulness rules.

### Coding
Software engineering, tests, security, rollback paths, and Windows/PowerShell guidance when local commands are genuinely required.

### Home
Home-automation guidance with strong household safety boundaries and no bypassing of security, life-safety devices, or physical interlocks.

### Workshop
Maker and fabrication assistance that calls out meaningful machinery, heat, electrical, chemical, ventilation, and PPE hazards.

### Business
Operational, pricing, customer, and planning support that separates facts from estimates and avoids invented market or financial data.

## Privacy

All five seeded profiles use `local_only`.

Build 009 introduces provider abstraction. Until then, profile execution continues exclusively through the Ollama adapter.

## Preferred models

Profiles have an optional `preferred_model`. Build 008 does not force a download or hard-code a model. If a preferred model is later assigned and is already installed, the web client can select it automatically.

This avoids choosing a model before the target PC GPU and VRAM inventory is complete.

## API

```text
GET /api/v1/models/profiles
```

returns enabled profiles.

Conversation creation accepts:

```json
{
  "title": "New conversation",
  "model": "installed-model",
  "profile_id": 1
}
```

Streaming chat accepts the active `profile_id` as well. An unknown or disabled profile is rejected.

## Database migration

Revision `0003`:
- creates `model_profiles`
- seeds the five built-in profiles
- adds a foreign key from `conversations.profile_id` to `model_profiles.id`
- adds an index on `conversations.profile_id`

## Security impact

- no new network listeners
- no cloud provider is enabled
- no tool execution is added
- no physical-device control is added
- profile prompts cannot grant permissions or bypass future tool confirmation rules
- disabled profiles cannot be selected through the public profile endpoint
- all seeded profiles are local-only

## Rollback

Before downgrading, export or note any conversations that depend on profiles.

Run the documented Alembic downgrade to revision `0002`. The downgrade:
- removes the conversation profile foreign key/index
- drops `model_profiles`

Conversation messages remain, but profile configuration is lost.

## External setup

None required for Build 008.

Live response testing still requires at least one local Ollama model. Repository tests use local fake providers and do not require Bash or any hosted database.
