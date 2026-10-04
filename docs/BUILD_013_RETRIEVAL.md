# Build 013 — Retrieval

## Purpose

Build 013 adds local retrieval over indexed knowledge chunks.

Search now supports:
- semantic similarity using the configured local Ollama embedding model
- keyword fallback when semantic embeddings are unavailable
- collection filters
- source-document filters
- ranked result metadata for the citation work in Build 014

This build does not yet generate grounded answers or enforce citations. Build 014 adds citation metadata and answer-grounding policy.

## Retrieval modes

### Auto

`auto` is the default.

The Hub first creates one local embedding for the query and ranks compatible stored chunk vectors by cosine similarity.

If the embedding provider is unavailable, returns an invalid vector, or there are no compatible semantic vectors under the active filters, the Hub falls back to local keyword matching.

### Semantic

`semantic` requires the configured embedding provider to succeed.

Provider failure is returned as an error rather than silently changing retrieval method.

### Keyword

`keyword` performs local token and phrase matching and does not require Ollama to be available.

Keyword scoring considers:
- unique query-term coverage
- term occurrence density
- exact phrase bonus

## Filters

Search accepts:
- `collection_ids`
- `document_ids`

When both are supplied they are combined as an intersection.

Only chunks belonging to documents with status `indexed` participate in retrieval.

## Semantic ranking

The initial SQLite deployment keeps vectors in JSON through the existing vector-store abstraction.

Build 013:
1. embeds the query locally
2. selects compatible stored vectors for the configured provider/model
3. applies active filters before ranking
4. validates vector dimensions
5. computes cosine similarity
6. returns the highest-ranked chunks

The implementation is intentionally portable so a future pgvector migration does not change the public search API.

## API

```text
POST /api/v1/knowledge/search
```

Example request:

```json
{
  "query": "workshop ventilation",
  "top_k": 8,
  "mode": "auto",
  "collection_ids": [],
  "document_ids": []
}
```

The response reports:
- method actually used
- optional fallback reason
- source document and collection
- chunk ID and ordinal
- chunk text
- stable character offsets
- ranking score

Build 014 will convert these retrieval results into citation-ready evidence.

## UI

The Knowledge workspace now includes:
- search query input
- Auto / Semantic / Keyword mode selector
- collection filter
- source-document filter
- ranked local result cards
- visible fallback explanation when semantic retrieval is unavailable

Ingestion and indexing remain available on the same page.

## Configuration

```text
KNOWLEDGE_SEARCH_TOP_K=8
```

The API allows 1–50 results per request. The configured value is the service default.

## Security and privacy

- document text remains local
- semantic query embeddings are generated through the configured local Ollama instance
- keyword fallback is entirely local
- search cannot execute document content
- search results do not grant tool or device permissions
- filters use persisted IDs rather than arbitrary filesystem paths
- no cloud account or new secret is required

## Database impact

No migration is required.

Build 013 reads the existing:
- knowledge collections
- documents
- document chunks
- chunk embeddings

## Rollback

Code rollback to Build 012 is sufficient.

No Build 013 persistence needs to be removed.

## External setup

No new application or service is required.

Live semantic retrieval requires the same embedding model used for Build 012 indexing. With the default configuration:

```powershell
ollama pull nomic-embed-text
```

Keyword retrieval remains usable if Ollama is temporarily unavailable.
