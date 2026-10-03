# Build 012 — Chunking and Embeddings

## Purpose

Build 012 turns ingested local document text into deterministic chunks and local embedding vectors so later builds can perform semantic retrieval.

This build does not yet answer questions from documents. Retrieval begins in Build 013 and citation-enforced answering follows in Build 014.

## Chunking

Defaults:

```text
KNOWLEDGE_CHUNK_CHARACTERS=1200
KNOWLEDGE_CHUNK_OVERLAP_CHARACTERS=200
```

The chunker:
- creates stable ordinal chunk numbers
- keeps each chunk below the configured character limit
- prefers paragraph/newline/space boundaries when possible
- overlaps adjacent chunks
- records original start/end character offsets
- stores citation metadata for later evidence linking

Documents with no extractable text are marked `no_text` rather than failing indexing.

## Local embeddings

Default configuration:

```text
KNOWLEDGE_EMBEDDING_PROVIDER=ollama
KNOWLEDGE_EMBEDDING_MODEL=nomic-embed-text
KNOWLEDGE_EMBEDDING_BATCH_SIZE=16
```

Build 012 uses Ollama's local embedding API. No document text is sent to a cloud provider.

The embedding adapter validates:
- one vector per input
- non-empty vectors
- numeric values
- consistent dimensions within one indexing pass

## Vector storage abstraction

The indexing service depends on a `VectorStore` contract rather than directly coupling retrieval to SQLite.

The initial backend is `SQLAlchemyVectorStore`, which stores portable JSON vectors locally.

This choice is deliberate:
- it works with the existing SQLite deployment
- it requires no native extension
- it keeps backup/restore simple
- Build 013 can implement semantic similarity locally
- a later migration to pgvector or another vector database does not require changing document/chunk APIs

## Persistence

Migration `0006` creates:

```text
document_chunks
chunk_embeddings
```

Each chunk stores:
- document ID
- ordinal
- text
- start/end character offsets
- citation metadata
- embedding reference

Each embedding stores:
- chunk ID
- provider
- model
- vector dimensions
- vector values

Successful indexing updates the document to `indexed` and sets `indexed_at`.

If embedding fails, the transaction is rolled back and the document is marked `index_error`.

## API

```text
POST /api/v1/knowledge/documents/{id}/index
GET  /api/v1/knowledge/documents/{id}/chunks
```

The index response reports:
- status
- chunk count
- embedding provider
- embedding model
- vector dimensions

## UI

The Knowledge surface now provides:
- Index locally
- Re-index locally
- indexing progress state
- indexed/error/no-text status
- chunk count and embedding model after successful indexing

File ingestion remains usable even when Ollama or the embedding model is unavailable.

## Security and privacy

- embeddings are generated locally
- no cloud AI account is required
- original documents remain under the local knowledge directory
- document content is still treated as untrusted source material
- indexing cannot execute document content
- embeddings do not grant permissions or tool access

## Rollback

Downgrade Alembic from revision `0006` to `0005`.

This removes:
- chunk embeddings
- document chunks

Original ingested documents from Build 011 remain intact.

## Live runtime setup

No new application is required.

The configured embedding model must be installed in Ollama before live indexing can succeed. With the default configuration, run this in PowerShell on the Ollama PC:

```powershell
ollama pull nomic-embed-text
```

CI uses a fake embedding provider and does not require that download.
