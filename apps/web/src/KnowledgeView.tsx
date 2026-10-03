import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  getKnowledgeCollections,
  getKnowledgeDocuments,
  uploadKnowledgeDocument,
  type KnowledgeCollection,
  type KnowledgeDocument,
} from "./api";

const SUPPORTED_FILE_TYPES = ".pdf,.txt,.md,.docx";

export function KnowledgeView() {
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [collectionId, setCollectionId] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getKnowledgeCollections(controller.signal),
      getKnowledgeDocuments(controller.signal),
    ])
      .then(([collectionResponse, documentResponse]) => {
        setCollections(collectionResponse);
        setDocuments(documentResponse);
        setCollectionId(collectionResponse[0]?.id ?? 1);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }
        setError(
          caught instanceof Error ? caught.message : "Unable to load local knowledge.",
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const collectionById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections],
  );

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || uploading) {
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const result = await uploadKnowledgeDocument(file, collectionId);
      if (result.duplicate) {
        setNotice(
          `${file.name} matches an existing document. No duplicate copy was created.`,
        );
      } else {
        setDocuments((current) => [
          result.document,
          ...current.filter((item) => item.id !== result.document.id),
        ]);
        setNotice(`${result.document.filename} was ingested locally.`);
      }
      setFile(null);

      const input = document.getElementById("knowledge-file");
      if (input instanceof HTMLInputElement) {
        input.value = "";
      }
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Document upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="knowledge-view" aria-label="Knowledge ingestion">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 011</p>
          <h1>Knowledge</h1>
          <p className="lede">
            Add private local documents now. Chunking, embeddings, retrieval, and cited answers
            arrive in Builds 012–014.
          </p>
        </div>
        <div className="health-card" role="status">
          <span className="status-dot online" aria-hidden="true" />
          <span>
            Local-only intake
            <small>{documents.length} document{documents.length === 1 ? "" : "s"}</small>
          </span>
        </div>
      </header>

      <div className="knowledge-grid">
        <form className="panel knowledge-upload" onSubmit={(event) => void submitUpload(event)}>
          <h2>Ingest a file</h2>
          <p>
            Supported: PDF, TXT, Markdown, and DOCX. Originals are stored locally and duplicate
            content is detected by SHA-256 hash.
          </p>

          <label>
            <span>Collection</span>
            <select
              value={collectionId}
              onChange={(event) => setCollectionId(Number(event.target.value))}
              disabled={uploading}
            >
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                  {collection.local_only ? " · local only" : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>File</span>
            <input
              id="knowledge-file"
              type="file"
              accept={SUPPORTED_FILE_TYPES}
              disabled={uploading}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={!file || uploading || collections.length === 0}
          >
            {uploading ? "Ingesting…" : "Ingest file"}
          </button>

          <small>Default maximum upload size: 25 MB.</small>
        </form>

        <article className="panel">
          <h2>What happens now</h2>
          <p>
            The Hub validates the type, extracts readable text, records metadata, hashes the
            original bytes, and stores one content-addressed local copy.
          </p>
          <p>
            PDF scans without embedded text can still be stored. OCR is intentionally not part of
            this build.
          </p>
        </article>
      </div>

      {notice ? (
        <p className="knowledge-notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="chat-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="knowledge-library" aria-labelledby="knowledge-library-title">
        <div className="knowledge-library-header">
          <div>
            <h2 id="knowledge-library-title">Ingested documents</h2>
            <p>Original files remain local. Indexing begins in Build 012.</p>
          </div>
        </div>

        {loading ? (
          <p>Loading local knowledge…</p>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <h2>No documents yet</h2>
            <p>Choose a supported file above to create the first local knowledge source.</p>
          </div>
        ) : (
          <div className="knowledge-document-list">
            {documents.map((item) => (
              <article className="knowledge-document" key={item.id}>
                <div>
                  <strong>{item.filename}</strong>
                  <small>
                    {collectionById.get(item.collection_id)?.name ?? "Collection"} ·{" "}
                    {formatBytes(item.size_bytes)}
                  </small>
                </div>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{item.status}</dd>
                  </div>
                  <div>
                    <dt>Text</dt>
                    <dd>{item.extracted_characters.toLocaleString()} chars</dd>
                  </div>
                  <div>
                    <dt>Pages</dt>
                    <dd>{item.page_count ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Hash</dt>
                    <dd title={item.content_hash}>{item.content_hash.slice(0, 12)}…</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}
