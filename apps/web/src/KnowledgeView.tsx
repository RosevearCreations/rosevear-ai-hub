import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  answerKnowledge,
  createKnowledgeCollection,
  deleteKnowledgeCollection,
  deleteKnowledgeDocument,
  getKnowledgeAdminStatus,
  getKnowledgeCollections,
  getKnowledgeDocuments,
  getOllamaModels,
  indexKnowledgeDocument,
  knowledgeEvidenceUrl,
  moveKnowledgeDocument,
  searchKnowledge,
  updateKnowledgeCollection,
  uploadKnowledgeDocument,
  type KnowledgeAdminStatus,
  type KnowledgeAnswerResponse,
  type KnowledgeCollection,
  type KnowledgeDocument,
  type KnowledgeIndexResponse,
  type OllamaModel,
  type KnowledgeSearchMode,
  type KnowledgeSearchResponse,
} from "./api";

const SUPPORTED_FILE_TYPES = ".pdf,.txt,.md,.docx";

export function KnowledgeView() {
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [adminStatus, setAdminStatus] = useState<KnowledgeAdminStatus | null>(null);
  const [collectionId, setCollectionId] = useState<number>(1);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [newCollectionLocalOnly, setNewCollectionLocalOnly] = useState(true);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [collectionBusyId, setCollectionBusyId] = useState<number | null>(null);
  const [documentAdminId, setDocumentAdminId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [indexingId, setIndexingId] = useState<number | null>(null);
  const [indexResults, setIndexResults] = useState<Map<number, KnowledgeIndexResponse>>(
    new Map(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<KnowledgeSearchMode>("auto");
  const [searchCollectionId, setSearchCollectionId] = useState("");
  const [searchDocumentId, setSearchDocumentId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<KnowledgeSearchResponse | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [answerModel, setAnswerModel] = useState("");
  const [answering, setAnswering] = useState(false);
  const [answerResult, setAnswerResult] = useState<KnowledgeAnswerResponse | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getKnowledgeCollections(controller.signal),
      getKnowledgeDocuments(controller.signal),
      getKnowledgeAdminStatus(controller.signal),
    ])
      .then(([collectionResponse, documentResponse, statusResponse]) => {
        setCollections(collectionResponse);
        setDocuments(documentResponse);
        setAdminStatus(statusResponse);
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

    getOllamaModels(controller.signal)
      .then((response) => {
        setModels(response.models);
        setAnswerModel(response.models[0]?.name ?? "");
      })
      .catch(() => {
        setModels([]);
        setAnswerModel("");
      });

    return () => controller.abort();
  }, []);

  const collectionById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections],
  );

  const filteredSourceDocuments = useMemo(() => {
    if (!searchCollectionId) {
      return documents;
    }
    const selected = Number(searchCollectionId);
    return documents.filter((document) => document.collection_id === selected);
  }, [documents, searchCollectionId]);

  async function refreshDocuments() {
    const [refreshed, statusResponse] = await Promise.all([
      getKnowledgeDocuments(),
      getKnowledgeAdminStatus(),
    ]);
    setDocuments(refreshed);
    setAdminStatus(statusResponse);
  }

  async function refreshCollections() {
    const [refreshed, statusResponse] = await Promise.all([
      getKnowledgeCollections(),
      getKnowledgeAdminStatus(),
    ]);
    setCollections(refreshed);
    setAdminStatus(statusResponse);
    if (!refreshed.some((item) => item.id === collectionId)) {
      setCollectionId(refreshed[0]?.id ?? 1);
    }
  }

  async function submitCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCollectionName.trim();
    if (!name || creatingCollection) {
      return;
    }

    setCreatingCollection(true);
    setError("");
    setNotice("");

    try {
      const created = await createKnowledgeCollection(
        name,
        newCollectionDescription.trim(),
        newCollectionLocalOnly,
      );
      await refreshCollections();
      setCollectionId(created.id);
      setNewCollectionName("");
      setNewCollectionDescription("");
      setNewCollectionLocalOnly(true);
      setNotice(`${created.name} collection created.`);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Collection creation failed.");
    } finally {
      setCreatingCollection(false);
    }
  }

  async function toggleCollectionLocalOnly(collection: KnowledgeCollection) {
    if (collectionBusyId !== null) {
      return;
    }

    setCollectionBusyId(collection.id);
    setError("");
    try {
      const updated = await updateKnowledgeCollection(collection.id, {
        local_only: !collection.local_only,
      });
      setCollections((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        `${updated.name} is now ${updated.local_only ? "local only" : "eligible for future non-local providers"}.`,
      );
      setAdminStatus(await getKnowledgeAdminStatus());
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Collection update failed.");
    } finally {
      setCollectionBusyId(null);
    }
  }

  async function removeCollection(collection: KnowledgeCollection) {
    if (collectionBusyId !== null) {
      return;
    }
    if (!window.confirm(`Delete the empty collection "${collection.name}"?`)) {
      return;
    }

    setCollectionBusyId(collection.id);
    setError("");
    try {
      await deleteKnowledgeCollection(collection.id);
      await refreshCollections();
      setNotice(`${collection.name} collection deleted.`);
      if (searchCollectionId === String(collection.id)) {
        setSearchCollectionId("");
        setSearchDocumentId("");
      }
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Collection deletion failed.");
    } finally {
      setCollectionBusyId(null);
    }
  }

  async function moveDocument(document: KnowledgeDocument, targetCollectionId: number) {
    if (documentAdminId !== null || targetCollectionId === document.collection_id) {
      return;
    }

    setDocumentAdminId(document.id);
    setError("");
    try {
      const updated = await moveKnowledgeDocument(document.id, targetCollectionId);
      setDocuments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        `${updated.filename} moved to ${collectionById.get(targetCollectionId)?.name ?? "collection"}.`,
      );
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Document move failed.");
    } finally {
      setDocumentAdminId(null);
    }
  }

  async function removeDocument(document: KnowledgeDocument) {
    if (documentAdminId !== null) {
      return;
    }
    if (
      !window.confirm(
        `Delete "${document.filename}" and its local chunks/embeddings? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDocumentAdminId(document.id);
    setError("");
    try {
      const result = await deleteKnowledgeDocument(document.id);
      await refreshDocuments();
      setSearchResult(null);
      setAnswerResult(null);
      if (searchDocumentId === String(document.id)) {
        setSearchDocumentId("");
      }
      setNotice(
        result.source_deleted
          ? `${document.filename} and its stored original were deleted.`
          : `${document.filename} was deleted from the knowledge index. The original file could not be removed automatically.`,
      );
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Document deletion failed.");
    } finally {
      setDocumentAdminId(null);
    }
  }

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

  async function indexDocument(document: KnowledgeDocument) {
    if (indexingId !== null) {
      return;
    }

    setIndexingId(document.id);
    setError("");
    setNotice("");

    try {
      const result = await indexKnowledgeDocument(document.id);
      setIndexResults((current) => {
        const next = new Map(current);
        next.set(document.id, result);
        return next;
      });
      await refreshDocuments();

      if (result.status === "no_text") {
        setNotice(
          `${document.filename} has no extractable text, so no embeddings were created.`,
        );
      } else {
        setNotice(
          `${document.filename} indexed into ${result.chunk_count} chunk${result.chunk_count === 1 ? "" : "s"} using ${result.embedding_model}.`,
        );
      }
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Local document indexing failed.",
      );
      await refreshDocuments().catch(() => undefined);
    } finally {
      setIndexingId(null);
    }
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query || searching) {
      return;
    }

    setSearching(true);
    setError("");
    setNotice("");
    setAnswerResult(null);

    try {
      const result = await searchKnowledge(query, {
        mode: searchMode,
        collectionIds: searchCollectionId ? [Number(searchCollectionId)] : [],
        documentIds: searchDocumentId ? [Number(searchDocumentId)] : [],
      });
      setSearchResult(result);
    } catch (caught: unknown) {
      setSearchResult(null);
      setError(
        caught instanceof Error ? caught.message : "Local knowledge search failed.",
      );
    } finally {
      setSearching(false);
    }
  }

  async function submitGroundedAnswer() {
    const query = searchQuery.trim();
    if (!query || !answerModel || answering) {
      return;
    }

    setAnswering(true);
    setError("");
    setNotice("");

    try {
      const result = await answerKnowledge(query, "ollama", answerModel, {
        mode: searchMode,
        collectionIds: searchCollectionId ? [Number(searchCollectionId)] : [],
        documentIds: searchDocumentId ? [Number(searchDocumentId)] : [],
      });
      setAnswerResult(result);
    } catch (caught: unknown) {
      setAnswerResult(null);
      setError(
        caught instanceof Error ? caught.message : "Grounded local answer failed.",
      );
    } finally {
      setAnswering(false);
    }
  }

  return (
    <section className="knowledge-view" aria-label="Knowledge ingestion, indexing, and retrieval">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 015</p>
          <h1>Knowledge</h1>
          <p className="lede">
            Administer private collections and documents, re-index local knowledge, and
            verify answers against citation-linked local evidence.
          </p>
        </div>
        <div className="health-card" role="status">
          <span className="status-dot online" aria-hidden="true" />
          <span>
            Local knowledge
            <small>
              {adminStatus?.indexed_document_count ?? 0}/{adminStatus?.document_count ?? documents.length} indexed
            </small>
          </span>
        </div>
      </header>

      <form className="panel knowledge-search" onSubmit={(event) => void submitSearch(event)}>
        <div>
          <h2>Search local knowledge</h2>
          <p>
            Auto mode uses local semantic search first and falls back to keyword matching
            if embeddings are unavailable.
          </p>
        </div>

        <label className="knowledge-search-query">
          <span>Search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="What do our local documents say about…"
            disabled={searching}
          />
        </label>

        <div className="knowledge-search-filters">
          <label>
            <span>Mode</span>
            <select
              value={searchMode}
              onChange={(event) => setSearchMode(event.target.value as KnowledgeSearchMode)}
              disabled={searching}
            >
              <option value="auto">Auto</option>
              <option value="semantic">Semantic only</option>
              <option value="keyword">Keyword only</option>
            </select>
          </label>

          <label>
            <span>Collection</span>
            <select
              value={searchCollectionId}
              onChange={(event) => {
                setSearchCollectionId(event.target.value);
                setSearchDocumentId("");
              }}
              disabled={searching}
            >
              <option value="">All collections</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Source</span>
            <select
              value={searchDocumentId}
              onChange={(event) => setSearchDocumentId(event.target.value)}
              disabled={searching}
            >
              <option value="">All documents</option>
              {filteredSourceDocuments.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.filename}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={!searchQuery.trim() || searching}
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {searchResult ? (
        <section className="knowledge-results" aria-labelledby="knowledge-results-title">
          <div className="knowledge-library-header">
            <div>
              <h2 id="knowledge-results-title">Search results</h2>
              <p>
                {searchResult.hits.length} result
                {searchResult.hits.length === 1 ? "" : "s"} · {searchResult.method}
              </p>
            </div>
          </div>

          {searchResult.fallback_reason ? (
            <p className="knowledge-notice" role="status">
              Semantic search was unavailable, so keyword fallback was used:{" "}
              {searchResult.fallback_reason}
            </p>
          ) : null}

          {searchResult.hits.length === 0 ? (
            <div className="empty-state">
              <h2>No matching indexed chunks</h2>
              <p>Try broader wording, another source, or keyword mode.</p>
            </div>
          ) : (
            <div className="knowledge-result-list">
              {searchResult.hits.map((hit) => (
                <article className="knowledge-result" key={hit.chunk_id}>
                  <div className="knowledge-result-meta">
                    <strong>{hit.filename}</strong>
                    <small>
                      {hit.collection_name}
                      {hit.location_label ? ` · ${hit.location_label}` : ""}
                      {" · "}chunk {hit.ordinal + 1} · {hit.method} · score{" "}
                      {hit.score.toFixed(3)}
                    </small>
                    <a
                      href={knowledgeEvidenceUrl(hit.evidence_path)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View evidence
                    </a>
                  </div>
                  <p>{hit.text}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {searchResult ? (
        <section className="panel grounded-answer" aria-labelledby="grounded-answer-title">
          <div>
            <h2 id="grounded-answer-title">Grounded answer</h2>
            <p>
              Uses only retrieved local evidence. Unsupported answers are rejected instead
              of being shown as factual.
            </p>
          </div>

          <div className="grounded-answer-controls">
            <label>
              <span>Local chat model</span>
              <select
                value={answerModel}
                onChange={(event) => setAnswerModel(event.target.value)}
                disabled={answering || models.length === 0}
              >
                {models.length === 0 ? (
                  <option value="">No local chat model installed</option>
                ) : (
                  models.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <button
              type="button"
              className="primary-button"
              onClick={() => void submitGroundedAnswer()}
              disabled={!answerModel || answering || !searchQuery.trim()}
            >
              {answering ? "Checking evidence…" : "Ask with citations"}
            </button>
          </div>

          {models.length === 0 ? (
            <small>
              Search citations work now. A local Ollama chat model is required only to
              generate a grounded answer.
            </small>
          ) : null}

          {answerResult ? (
            <div className="grounded-answer-result" role="status">
              <strong>{answerResult.grounding_status.replaceAll("_", " ")}</strong>
              <p>{answerResult.answer}</p>
              {answerResult.citations.length > 0 ? (
                <div className="grounded-citations">
                  {answerResult.citations.map((citation) => (
                    <a
                      key={citation.citation_id}
                      href={knowledgeEvidenceUrl(citation.evidence_path)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      [{citation.citation_id}] {citation.source_name}
                      {citation.location_label ? ` · ${citation.location_label}` : ""}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}


      <section className="knowledge-admin" aria-labelledby="knowledge-admin-title">
        <div className="knowledge-library-header">
          <div>
            <h2 id="knowledge-admin-title">Knowledge administration</h2>
            <p>Create collections, enforce local-only privacy, and monitor index health.</p>
          </div>
        </div>

        <div className="knowledge-admin-grid">
          <article className="panel knowledge-status">
            <h2>Index status</h2>
            <dl>
              <div><dt>Collections</dt><dd>{adminStatus?.collection_count ?? collections.length}</dd></div>
              <div><dt>Documents</dt><dd>{adminStatus?.document_count ?? documents.length}</dd></div>
              <div><dt>Indexed</dt><dd>{adminStatus?.indexed_document_count ?? 0}</dd></div>
              <div><dt>Needs indexing</dt><dd>{adminStatus?.needs_indexing_count ?? 0}</dd></div>
              <div><dt>Chunks</dt><dd>{adminStatus?.chunk_count ?? 0}</dd></div>
              <div><dt>Embeddings</dt><dd>{adminStatus?.embedding_count ?? 0}</dd></div>
              <div><dt>Stored sources</dt><dd>{formatBytes(adminStatus?.total_source_bytes ?? 0)}</dd></div>
              <div><dt>Local-only</dt><dd>{adminStatus?.local_only_collection_count ?? 0}</dd></div>
            </dl>
          </article>

          <form className="panel knowledge-collection-form" onSubmit={(event) => void submitCollection(event)}>
            <h2>Create collection</h2>
            <label>
              <span>Name</span>
              <input
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                maxLength={128}
                required
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                value={newCollectionDescription}
                onChange={(event) => setNewCollectionDescription(event.target.value)}
                rows={3}
                maxLength={2000}
              />
            </label>
            <label className="knowledge-checkbox">
              <input
                type="checkbox"
                checked={newCollectionLocalOnly}
                onChange={(event) => setNewCollectionLocalOnly(event.target.checked)}
              />
              <span>Keep this collection local only</span>
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={creatingCollection || !newCollectionName.trim()}
            >
              {creatingCollection ? "Creating…" : "Create collection"}
            </button>
          </form>
        </div>

        <div className="knowledge-collection-list">
          {collections.map((collection) => {
            const documentCount = documents.filter(
              (document) => document.collection_id === collection.id,
            ).length;
            const busy = collectionBusyId === collection.id;
            return (
              <article className="knowledge-collection-card" key={collection.id}>
                <div>
                  <strong>{collection.name}</strong>
                  <small>
                    {documentCount} document{documentCount === 1 ? "" : "s"}
                    {collection.description ? ` · ${collection.description}` : ""}
                  </small>
                </div>
                <label className="knowledge-checkbox">
                  <input
                    type="checkbox"
                    checked={collection.local_only}
                    onChange={() => void toggleCollectionLocalOnly(collection)}
                    disabled={busy}
                  />
                  <span>Local only</span>
                </label>
                <button
                  type="button"
                  onClick={() => void removeCollection(collection)}
                  disabled={busy || collection.name === "Inbox" || documentCount > 0}
                  title={
                    collection.name === "Inbox"
                      ? "The default Inbox cannot be deleted."
                      : documentCount > 0
                        ? "Move or delete the collection documents first."
                        : "Delete this empty collection."
                  }
                >
                  {busy ? "Working…" : "Delete"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="knowledge-grid">
        <form className="panel knowledge-upload" onSubmit={(event) => void submitUpload(event)}>
          <h2>Ingest a file</h2>
          <p>
            Supported: PDF, TXT, Markdown, and DOCX. Originals remain local and duplicate
            content is detected by SHA-256.
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
          <h2>Local indexing</h2>
          <p>
            Each document can be chunked and embedded locally. The default embedding
            model is <strong>nomic-embed-text</strong> through Ollama.
          </p>
          <p>
            Search filters can limit retrieval to one collection or one source document.
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
            <h2 id="knowledge-library-title">Local documents</h2>
            <p>Chunking, embeddings, and retrieval stay on this machine.</p>
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
            {documents.map((item) => {
              const result = indexResults.get(item.id);
              const busy = indexingId === item.id;

              return (
                <article className="knowledge-document" key={item.id}>
                  <div>
                    <strong>{item.filename}</strong>
                    <small>
                      {collectionById.get(item.collection_id)?.name ?? "Collection"} ·{" "}
                      {formatBytes(item.size_bytes)}
                    </small>
                    {result ? (
                      <small>
                        {result.chunk_count} chunk{result.chunk_count === 1 ? "" : "s"} ·{" "}
                        {result.embedding_model}
                        {result.dimensions ? ` · ${result.dimensions} dimensions` : ""}
                      </small>
                    ) : null}
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
                  <div className="knowledge-document-actions">
                    <label>
                      <span>Collection</span>
                      <select
                        value={item.collection_id}
                        onChange={(event) => void moveDocument(item, Number(event.target.value))}
                        disabled={documentAdminId !== null}
                      >
                        {collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void indexDocument(item)}
                      disabled={indexingId !== null || documentAdminId !== null}
                    >
                      {busy
                        ? "Indexing…"
                        : item.status === "indexed"
                          ? "Re-index locally"
                          : "Index locally"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeDocument(item)}
                      disabled={documentAdminId !== null || indexingId !== null}
                    >
                      {documentAdminId === item.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </article>
              );
            })}
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
