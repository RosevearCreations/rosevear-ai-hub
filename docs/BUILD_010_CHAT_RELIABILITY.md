# Build 010 — Chat Reliability

## Purpose

Build 010 makes local chat fail safely and recover cleanly when Ollama or a future provider is slow, offline, interrupted, or restarted.

## Timeout behavior

Provider adapters normalize timeouts separately from other request failures.

Ollama uses:
- `OLLAMA_TIMEOUT_SECONDS` for discovery/status requests
- `OLLAMA_GENERATION_TIMEOUT_SECONDS` for model generation

A timeout is treated as a provider-unavailable event and is eligible for a conservative retry.

## Retry policy

Configuration:
- `PROVIDER_GENERATION_ATTEMPTS=2`
- `PROVIDER_RETRY_DELAY_SECONDS=0.35`

The attempt count includes the first request.

A generation is retried only when:
- the provider is unavailable or times out
- no response token has been emitted yet
- attempts remain

Once any token has been emitted, the Hub does **not** automatically replay the request. This avoids duplicate or contradictory output.

The stream emits a `retrying` event so the UI can show what is happening.

## Provider offline state

The process-level provider registry tracks:
- consecutive unavailable failures
- last unavailable error
- temporary offline cooldown
- retry-after seconds

After retry exhaustion, the provider enters a short cooldown controlled by:

```text
PROVIDER_OFFLINE_COOLDOWN_SECONDS=5
```

The provider status API remains available even when the provider itself is offline.

The status API exposes degraded/offline metadata but never secrets.

A successful health probe or generation clears the failure state immediately.

## Graceful degradation

When the provider is offline:
- conversations and stored messages remain readable
- the chat page stays open
- new generation controls are disabled
- the UI shows the provider error
- the user can run a fresh provider check without restarting the Hub

Failure of the Ollama model-list request no longer prevents conversation history from loading.

## Persistence recovery

Before generation begins, the Hub persists:
1. the user message
2. an assistant placeholder with status `pending`

At generation completion, the assistant record becomes `complete`.

On controlled failure it becomes:
- `error`
- `cancelled`

If a process interruption or client disconnect leaves a generation unfinished, the placeholder is retained. On the next safe conversation read or generation start, abandoned `pending`/`streaming` records are marked `interrupted`.

Partial assistant text is preserved when available.

This means provider failure no longer causes the generated turn to disappear silently.

## Security impact

Build 010:
- adds no cloud provider
- adds no external tool execution
- adds no device control
- does not retry after tokens begin
- does not expose secrets through reliability status
- retains the local-only default

Retries are deliberately bounded to avoid request storms.

## Database impact

No schema migration is required. Existing `chat_messages.status` supports the additional lifecycle values:
- pending
- complete
- error
- cancelled
- interrupted

## Rollback

Code rollback to Build 009 is sufficient.

Rows with Build 010 lifecycle statuses remain valid string data. Build 009 can still read them, although it will not create or recover those statuses itself.

## External setup

None.

The reliability defaults work with the existing local Ollama installation. No Bash, hosted database, cloud account, or new secret is required.
