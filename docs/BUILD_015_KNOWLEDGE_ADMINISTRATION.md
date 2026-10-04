# Build 015 — Knowledge Administration

## Purpose

Build 015 turns the Knowledge page into an administration surface instead of an ingestion-only workflow.

It adds collection creation, local-only privacy controls, deletion safeguards, document movement, document deletion, stored-source cleanup, index health/status, and explicit re-index administration.

## Collections

Collections can be created with a name, description, and local-only flag.

The default Inbox collection remains protected from deletion. A collection cannot be deleted while it still contains documents. Documents must be moved or deleted first.

The local-only flag is the same privacy boundary enforced by grounded answers. A future cloud provider cannot receive evidence from a local-only collection.

## Documents

Documents can be moved between collections without re-ingestion.

Deleting a document removes document metadata, chunks, embeddings, and the locally stored original when it can be safely resolved beneath the configured knowledge storage root.

Source deletion is path-contained. A stored path that resolves outside the knowledge storage directory is never removed.

## Re-indexing

The existing indexing operation is idempotent for document chunks and embeddings: old vectors and chunks are removed, fresh chunks and embeddings are written, and document index state is refreshed.

The UI labels indexed documents as Re-index locally.

## Status

GET /api/v1/knowledge/admin/status reports collection count, local-only collection count, document count, indexed documents, documents needing indexing, chunk count, embedding count, total source bytes, and document counts by status.

## API additions

- GET /api/v1/knowledge/admin/status
- POST /api/v1/knowledge/collections
- PATCH /api/v1/knowledge/collections/{collection_id}
- DELETE /api/v1/knowledge/collections/{collection_id}
- PATCH /api/v1/knowledge/documents/{document_id}/collection
- DELETE /api/v1/knowledge/documents/{document_id}

The existing POST /api/v1/knowledge/documents/{document_id}/index endpoint remains the re-index operation.

## Security and safety

- no new public listener
- no cloud dependency
- no new secret
- local-only policy is preserved
- document deletion is explicit and confirmed in the UI
- collection deletion is blocked while occupied
- Inbox cannot be deleted
- file deletion is constrained to the configured knowledge storage root

Authentication and per-user authorization arrive in Build 016. Until then, this administration surface remains intended only for the local/private Hub deployment defined by the security model.

## Database impact

No schema migration is required. Build 015 uses the existing collection, document, chunk, and embedding tables.

## Rollback

Code rollback to Build 014 is sufficient.

Collections and moved documents remain valid. Documents already deleted cannot be restored by code rollback; restore them from backup or re-ingest the original source.

## External setup

None.
