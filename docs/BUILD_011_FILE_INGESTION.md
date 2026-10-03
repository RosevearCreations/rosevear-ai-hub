# Build 011 — File Ingestion

## Purpose

Build 011 begins the private knowledge/RAG phase by accepting supported source documents, validating them, extracting readable text, hashing the original bytes, detecting duplicates, and storing one local original.

This build does not create embeddings or answer questions from the documents. Those capabilities arrive in Builds 012–014.

## Supported formats

- PDF
- TXT
- Markdown
- DOCX

TXT and Markdown must be UTF-8.

PDF files may be text PDFs or image-only scans. Image-only scans can be stored, but Build 011 does not run OCR.

Encrypted PDFs are rejected.

DOCX files are parsed as Office Open XML archives. Macros or embedded programs are never executed.

## Validation limits

Defaults:

```text
KNOWLEDGE_MAX_UPLOAD_BYTES=26214400
KNOWLEDGE_MAX_EXPANDED_DOCX_BYTES=104857600
```

The API reads uploads in bounded chunks and stops after the configured upload limit.

DOCX archives are checked for required Office XML members and total expanded size before document parsing.

## Storage

Default root:

```text
./data/knowledge
```

Originals are stored under:

```text
originals/<sha256>.<extension>
```

The database stores the relative path only.

The runtime knowledge directory is excluded from Git.

## Hashing and duplicate detection

SHA-256 is calculated over the exact uploaded bytes.

`documents.content_hash` is unique.

When another upload has the same hash:
- the existing document is returned
- `duplicate=true`
- no second database row is created
- no second original is written

A duplicate can have a different filename; byte identity determines duplication.

## Extraction

### TXT / Markdown
Decoded as UTF-8 (including UTF-8 BOM support).

### PDF
Uses pypdf text extraction page by page. Page count and whether any embedded text was found are recorded.

### DOCX
Uses python-docx. Paragraph text and table cell text are extracted. Paragraph and table counts are recorded.

## Persistence

Migration `0005` creates:

```text
knowledge_collections
documents
```

It seeds a local-only `Inbox` collection.

Each document stores:
- collection
- safe filename
- content hash
- MIME type
- relative source path
- original size
- extracted text
- format-specific metadata
- ingestion status
- created time
- future indexing time

`indexed_at` remains null until later indexing work.

## API

```text
GET  /api/v1/knowledge/collections
GET  /api/v1/knowledge/documents
GET  /api/v1/knowledge/documents/{id}
POST /api/v1/knowledge/documents
```

Upload uses multipart form data:
- `file`
- `collection_id` (defaults to 1 / Inbox)

A new document returns HTTP 201. A duplicate returns HTTP 200 with `duplicate=true`.

## UI

The Knowledge navigation surface now provides:
- collection selection
- supported-file chooser
- ingestion status
- duplicate feedback
- current document list
- size, text-character count, PDF page count, and shortened hash

Deletion and collection administration are deliberately deferred to Build 015.

## Security

Uploaded content remains untrusted even after successful parsing.

File ingestion cannot:
- execute code
- grant permissions
- invoke AI tools
- bypass confirmation
- change system policy

Build 014 will carry this untrusted-source policy into cited answering.

## Rollback

Downgrade Alembic from revision `0005` to `0004` to remove the Build 011 knowledge tables.

Before downgrade, back up any locally ingested originals that need to be retained.

Database downgrade does not automatically delete files under `data/knowledge`; this prevents destructive file loss during rollback.

## External setup

None.

No hosted database, cloud storage, cloud AI, or other application is required. All ingestion runs locally.
