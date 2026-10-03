# Build 009 — Provider Abstraction

## Purpose

Build 009 separates chat orchestration from any one AI vendor or runtime.

The Hub can now reason about AI providers through one common contract while continuing to use Ollama as the only enabled provider.

## Provider contract

Every AI provider exposes:
- stable provider key
- display name
- local/cloud type
- privacy policy
- streaming capability
- tool-call capability metadata
- enabled state
- health
- model discovery
- streaming chat

Normalized errors distinguish:
- provider unavailable
- provider request failure

## Provider registry

The provider registry is the routing boundary for chat.

Build 009 registers:
- `ollama`

Future adapters can be added without changing the chat persistence model or conversation API shape.

Unknown or disabled providers are rejected before a conversation or generation is routed.

## Optional cloud contract

A separate `OptionalCloudProvider` contract exists for future cloud adapters.

Build 009 does **not**:
- configure a cloud provider
- store any cloud API key
- transmit chat content to a cloud service
- add a required cloud dependency

Any future cloud provider must remain explicitly optional and disclose when content leaves the local machine.

## Persistence

Migration `0004` adds:
- `conversations.provider`
- `chat_messages.provider`

Existing conversations default to `ollama`.

User messages keep provider null because they are user-authored. Assistant messages record the provider that generated them.

## Routing rules

For a generation, provider selection follows:
1. explicit provider in the request
2. profile preferred provider
3. conversation provider
4. Ollama fallback

The selected provider is validated through the registry before execution.

## API

Provider metadata is available from:

```text
GET /api/v1/models/providers
```

The response exposes routing-safe status metadata only. It never exposes secrets.

Conversation and stream requests now accept a provider key.

## UI

The chat UI now shows:
- selected profile
- selected provider
- selected model
- provider online/offline state
- provider used for assistant messages

Only available providers can be selected for generation.

## Security

Build 009 adds no physical-device control and no external tool execution.

Provider prompts or responses cannot grant permissions. Future tool execution remains governed by the separate tool bus and confirmation model.

No provider secret is logged or returned through the provider status API.

## Rollback

Downgrade Alembic from revision `0004` to `0003`.

This removes provider columns while preserving prior Build 008 profile and chat data. Provider attribution added during Build 009 is lost after downgrade.

## External setup

None.

Ollama remains the only active provider. A model download is not required for CI, migrations, provider routing tests, or desktop packaging.
