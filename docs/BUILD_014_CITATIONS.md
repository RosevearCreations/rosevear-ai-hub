# Build 014 — Citations

## Purpose

Build 014 turns retrieval results into verifiable local evidence and adds a strict grounded-answer path.

The build adds:
- source names
- page numbers where extractable from PDFs
- Markdown section names where available
- stable evidence links
- citation-ready retrieval results
- evidence-only answer prompting
- post-generation citation validation
- local-only collection enforcement

## Citation metadata

New PDF ingestion stores character ranges for each extracted page.

New Markdown ingestion stores character ranges for headings and their sections.

During indexing, each chunk receives the best available location metadata:
- page
- section
- stable character offsets
- chunk ordinal

Existing documents without page/section spans remain valid. Their citations continue to use source name, chunk number, and character offsets until they are re-ingested/re-indexed.

## Evidence links

Every retrieval hit includes:

```text
/api/v1/knowledge/evidence/{chunk_id}
```

The evidence endpoint returns the exact stored chunk text plus:
- source document
- collection
- page/section when available
- character offsets

This makes every displayed citation independently inspectable inside the local Hub.

## Grounded-answer policy

`POST /api/v1/knowledge/answer` retrieves local evidence first and then asks the selected provider to answer using only that evidence.

Policy:
1. outside knowledge is prohibited
2. every factual answer must cite supplied IDs such as `[K1]`
3. unknown citation IDs are rejected
4. an answer with no citations is rejected
5. insufficient evidence must return the explicit insufficient-evidence path
6. local-only collections cannot be sent to a cloud provider

The Hub validates the provider output before returning it as a grounded answer.

A provider response that fails validation is replaced with a safe rejection message rather than shown as a factual answer.

## Privacy

The default and current provider is Ollama, so retrieval and grounded answers stay local.

The local-only collection rule is enforced at the API boundary for future provider adapters.

## Database impact

No schema migration is required.

Citation location information uses the existing JSON metadata fields on documents and chunks.

## Rollback

Code rollback to Build 013 is sufficient.

Build 013 safely ignores the additional citation metadata stored in existing JSON fields.

## External setup

No new application or hosted service is required.

Citation search works without a chat model. Grounded answer generation requires an installed Ollama chat model.

The embedding model remains separate and defaults to `nomic-embed-text`.
