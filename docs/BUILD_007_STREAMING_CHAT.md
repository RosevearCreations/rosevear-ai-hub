# Build 007 — Streaming Chat

## Scope

Build 007 adds the first persistent local chat workflow:
- conversation creation and listing
- per-conversation model choice
- persisted user and assistant messages
- Ollama `/api/chat` token streaming
- client-side incremental rendering
- generation cancellation
- local conversation history
- a database migration for chat messages

## Non-scope

This build does not add authentication, model profiles, cloud providers, retrieval/RAG, tool execution, Home Assistant control, or automatic model downloads. Those remain in later builds.

## Pre-auth local user

Authentication intentionally arrives in Build 016. Until then, chat persistence uses a reserved local placeholder user named `__local_pre_auth__`.

It has no login endpoint and grants no network access. Build 016 must migrate or replace this placeholder when real accounts are introduced.

## Streaming protocol

The backend returns newline-delimited JSON from:

```text
POST /api/v1/chat/conversations/{conversation_id}/stream
```

Events:
- `generation` — generation identifier
- `token` — one text chunk
- `done` — assistant message was persisted
- `cancelled` — generation was stopped
- `error` — Ollama could not complete the generation

The generation ID is also exposed through `X-Generation-ID` so the client can request cancellation while tokens are still arriving.

## Persistence rule

The user message is committed before generation begins.

The assistant message is committed only after Ollama completes successfully. A cancelled or failed partial assistant response is not persisted in Build 007. Build 010 will add persistence recovery and stronger failure semantics.

## Security impact

- no new public listener
- no shell execution
- no filesystem access from the webview
- prompts are sent only to the configured Ollama endpoint
- default Ollama endpoint remains localhost
- CORS exposes only the generation ID response header required by the local client

## Rollback

1. Return application code to the previous Build 006 commit.
2. Run `alembic downgrade 0001` before starting the older backend.
3. The downgrade removes `chat_messages` and the conversation `model` column.

Downgrading destroys Build 007 chat history, so back up the SQLite database first if that history matters.

## Runtime acceptance

CI validates the feature with a fake streaming Ollama client. Live local acceptance additionally requires Ollama running with at least one installed model.

No Bash commands are required. Windows/PowerShell remains the documented household runtime.
