import { useEffect, useMemo, useState } from "react";

import {
  getKnowledgeReviews,
  indexKnowledgeDocument,
  reviewKnowledgeDocument,
  type KnowledgeCollection,
  type KnowledgeDocument,
  type KnowledgeSourceReview,
} from "./api";

export const MAX_INDEX_QUEUE = 3;

export function projectSummary(
  collection: KnowledgeCollection,
  documents: KnowledgeDocument[],
) {
  const sources = documents.filter((item) => item.collection_id === collection.id);
  return {
    count: sources.length,
    indexed: sources.filter((item) => item.status === "indexed").length,
    needIndex: sources.filter((item) => item.status !== "indexed").length,
  };
}

export function boundedIndexQueue(
  selected: number[],
  documents: KnowledgeDocument[],
): number[] {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  return [...new Set(selected)]
    .filter((id) => byId.has(id) && byId.get(id)?.status !== "indexed")
    .slice(0, MAX_INDEX_QUEUE);
}

export function KnowledgeProjectWorkspace({
  collections,
  documents,
  canReview,
  onSelectProject,
  onIndexed,
}: {
  collections: KnowledgeCollection[];
  documents: KnowledgeDocument[];
  canReview: boolean;
  onSelectProject: (id: number) => void;
  onIndexed: () => Promise<void>;
}) {
  const [project, setProject] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [reviews, setReviews] = useState<KnowledgeSourceReview[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [reviewBusy, setReviewBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!canReview) return;
    const controller = new AbortController();
    getKnowledgeReviews(controller.signal)
      .then(setReviews)
      .catch(() => { if (!controller.signal.aborted) setFeedback("Private reviews could not be loaded."); });
    return () => controller.abort();
  }, [canReview]);

  const activeProject = project !== null && collections.some((c) => c.id === project)
    ? project : collections[0]?.id ?? 0;
  const byReview = useMemo(() => new Map(reviews.map((item) => [item.document_id, item])), [reviews]);
  const sourceList = useMemo(
    () => documents.filter((item) => item.collection_id === activeProject),
    [documents, activeProject],
  );
  const visible = sourceList.filter((item) =>
    filter === "all"
    || (filter === "not_indexed" && item.status !== "indexed")
    || (filter === "indexed" && item.status === "indexed")
    || (filter === "flagged" && byReview.get(item.id)?.status === "flagged")
    || (filter === "needs_review" && (byReview.get(item.id)?.status ?? "needs_review") === "needs_review")
  );
  const queue = boundedIndexQueue(selected, sourceList);

  function toggleIndex(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= MAX_INDEX_QUEUE) return prev;
      return [...prev, id];
    });
  }

  async function saveReview(documentId: number, status: KnowledgeSourceReview["status"]) {
    setReviewBusy(documentId);
    setFeedback("");
    try {
      const saved = await reviewKnowledgeDocument(documentId, {
        status, note: (notes[documentId] ?? byReview.get(documentId)?.note ?? "").trim(),
      });
      setReviews((current) => [saved, ...current.filter((item) => item.document_id !== documentId)]);
      setFeedback("Private source review saved locally.");
    } catch {
      setFeedback("Review could not be saved. Confirm Owner/Admin access.");
    } finally {
      setReviewBusy(null);
    }
  }

  async function executeQueue() {
    if (running || queue.length === 0) return;
    const count = queue.length;
    if (!window.confirm(
      "Index " + count + " selected local source(s) sequentially? No files are uploaded or published.",
    )) return;
    setRunning(true);
    setFeedback("");
    let finished = 0;
    try {
      for (const documentId of queue) {
        await indexKnowledgeDocument(documentId);
        finished++;
        setSelected((current) => current.filter((id) => id !== documentId));
      }
      setFeedback(finished + " local source(s) indexed. Review citation evidence before relying on answers.");
    } catch {
      setFeedback(
        finished + " indexed; stopped on an error. Remaining items require a manual retry. Check Ollama and source text.",
      );
    } finally {
      await onIndexed().catch(() => undefined);
      setRunning(false);
    }
  }

  return (
    <section className="panel knowledge-project-workspace" aria-label="Knowledge projects workspace">
      <header>
        <p className="eyebrow">Build 055</p>
        <h2>Knowledge projects &amp; source review</h2>
        <p>One private collection per project. All uploads are manual; a duplicate hash is
          reused instead of creating a second copy. Source review is not publication approval.</p>
      </header>
      <div className="knowledge-project-cards">
        {collections.map((collection) => {
          const summary = projectSummary(collection, documents);
          return (
            <button key={collection.id} type="button"
              aria-pressed={activeProject === collection.id}
              onClick={() => { setProject(collection.id); setSelected([]); setFilter("all"); }}
            >
              <strong>{collection.name}</strong>
              <small>{summary.count} source(s) · {summary.indexed} indexed · {summary.needIndex} awaiting index</small>
              <small>{collection.local_only ? "Local only" : "Non-local provider eligibility configured"}</small>
            </button>
          );
        })}
      </div>
      {collections.length === 0 ? <p>Create a collection to begin a private project.</p> : (
        <>
          <div className="knowledge-project-tools">
            <button type="button" onClick={() => onSelectProject(activeProject)}>
              Search this project with citations
            </button>
            <label>Source status
              <select aria-label="Filter project sources" value={filter}
                onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All sources</option>
                <option value="not_indexed">Needs indexing</option>
                <option value="indexed">Indexed</option>
                {canReview && <option value="flagged">Flagged review</option>}
                {canReview && <option value="needs_review">Needs review</option>}
              </select>
            </label>
          </div>
          <p>{visible.length} of {sourceList.length} sources in this project.
            Source citations below remain tied to original indexed documents.</p>
          <div className="knowledge-project-sources">
            {visible.map((doc) => {
              const saved = byReview.get(doc.id);
              const eligible = doc.status !== "indexed";
              return (
                <article key={doc.id} className="knowledge-project-source">
                  <div>
                    <strong>{doc.filename}</strong>
                    <small>{doc.status} · {doc.extracted_characters} extracted characters ·
                      hash {doc.content_hash.slice(0, 12)}…</small>
                    <small>Uploaded {new Date(doc.created_at).toLocaleDateString()} ·
                      Review: {canReview ? saved?.status ?? "needs_review" : "Owner/Admin only"}</small>
                  </div>
                  {eligible && (
                    <label>
                      <input type="checkbox" checked={selected.includes(doc.id)}
                        disabled={running || (!selected.includes(doc.id) && queue.length >= MAX_INDEX_QUEUE)}
                        onChange={() => toggleIndex(doc.id)} /> Queue for local indexing
                    </label>
                  )}
                  {canReview && (
                    <details>
                      <summary>Private source review</summary>
                      <label>Review note (max 500 characters)
                        <textarea maxLength={500} value={notes[doc.id] ?? saved?.note ?? ""}
                          onChange={(event) => setNotes((prev) => ({
                            ...prev, [doc.id]: event.target.value,
                          }))} />
                      </label>
                      <div className="knowledge-project-review-actions">
                        {(["needs_review", "approved", "flagged"] as const).map((status) => (
                          <button key={status} type="button" disabled={reviewBusy !== null}
                            onClick={() => void saveReview(doc.id, status)}>
                            {status.replaceAll("_", " ")}
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
          <div className="knowledge-project-queue">
            <strong>Operator indexing queue: {queue.length}/{MAX_INDEX_QUEUE}</strong>
            <button type="button" onClick={() => void executeQueue()}
              disabled={running || queue.length === 0}>
              {running ? "Indexing sequentially…" : "Run selected local indexing"}
            </button>
            <small>Maximum {MAX_INDEX_QUEUE} per manual run; stops on failure. No background
              uploads, automatic jobs or cloud publication.</small>
          </div>
        </>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  );
}
