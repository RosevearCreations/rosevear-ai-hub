import {useEffect, useMemo, useState, type FormEvent} from "react";

import {SpeechToTextPanel} from "./SpeechToTextPanel";
import {useLocalTextToSpeech} from "./localTextToSpeech";
import {
  askPrivateHelper380, getOllamaModels, privateHelperContexts380, privateHelperSources380,
  type PrivateHelperContext380, type PrivateHelperResult380,
  type PrivateHelperSource380,
} from "./api";
import "./PrivateHelper380.css";

/** One owner-requested readback only; never mounts chat/device action providers. */
export function PrivateHelper380() {
  const [sources, setSources] = useState<PrivateHelperSource380[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [contexts, setContexts] = useState<PrivateHelperContext380[]>([]);
  const [device, setDevice] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<PrivateHelperResult380 | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const voice = useLocalTextToSpeech();

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      privateHelperSources380(controller.signal),
      privateHelperContexts380(controller.signal),
    ]).then(([manuals, references]) => {
      if (!controller.signal.aborted) {
        setSources(manuals.sources);
        setContexts(references.references);
      }
    }).catch(cause => {
      if (!controller.signal.aborted) setError(
        cause instanceof Error ? cause.message : "Local helper is unavailable.",
      );
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    getOllamaModels(controller.signal).then(modelsList => {
      if (!controller.signal.aborted) setModels(modelsList.models.map(m => m.name));
    }).catch(() => {
      if (!controller.signal.aborted) setModels([]);
    });
    return () => controller.abort();
  }, []);

  const context = useMemo(() => contexts.find(c => c.kind + ":" + c.id === device), [
    contexts, device,
  ]);
  function toggleSource(id: number, checked: boolean) {
    setResult(null);
    setSelected(current => checked ? [...current, id].slice(0, 8)
      : current.filter(x => x !== id));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !question.trim() || selected.length === 0) return;
    voice.stop();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const result = await askPrivateHelper380({
        question: question.trim(), document_ids: selected, model,
        context_kind: context?.kind ?? null, context_id: context?.id ?? null,
      });
      setResult(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cannot read approved sources.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="private380">
    <header className="page-header">
      <div>
        <p className="eyebrow">Build 380 · Approved local evidence only</p>
        <h1>Private Home &amp; Workshop Assistant</h1>
        <p className="lede">
          Ask our local manuals about home equipment and workshop projects.
          This helper has <strong>no machine controls, payment permissions, cloud AI
          calls, or automatic voice recording</strong>.
        </p>
      </div>
    </header>

    <section className="panel">
      <h2>1. Choose owner-approved local manuals</h2>
      <p>Only indexed documents already approved in Knowledge appear here.
        Approval is performed in Knowledge by an owner or administrator; selecting
        an item here does not approve it. Choose up to eight.</p>
      {loading && <p role="status">Loading approved manual inventory…</p>}
      {!loading && sources.length === 0 &&
        <p role="status">No approved, indexed local manuals are available.
          Upload, index and approve a document in Knowledge first.</p>}
      <fieldset className="private380-sources">
        <legend>Approved documents</legend>
        {sources.map(s => <label key={s.documentId} className="private380-source">
          <input type="checkbox" checked={selected.includes(s.documentId)}
            disabled={busy || (!selected.includes(s.documentId) && selected.length >= 8)}
            onChange={event => toggleSource(s.documentId, event.target.checked)} />
          <span><strong>{s.filename}</strong> · {s.collection} · approved local source</span>
        </label>)}
      </fieldset>
    </section>

    <section className="panel">
      <h2>2. Reference context (optional)</h2>
      <p>A reference helps interpret a question, but it does <strong>not</strong>
        verify a physical device, report live sensor readings, or authorize control.</p>
      <label>Known local device or workshop registry entry
        <select value={device} disabled={busy}
          onChange={event => {setDevice(event.target.value); setResult(null);}}>
          <option value="">No device selected</option>
          {contexts.map(c => <option key={c.kind + ":" + c.id} value={c.kind + ":" + c.id}>
            {c.kind === "home" ? "Home" : "Workshop"} · {c.name} ({c.type})
          </option>)}
        </select>
      </label>
    </section>

    <section className="panel">
      <h2>3. Ask privately</h2>
      <form className="private380-form" onSubmit={event => void submit(event)}>
        <label>Question (600 characters maximum)
          <textarea rows={3} required minLength={3} maxLength={600}
            disabled={busy} value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder="What does the approved manual say about checking the filter?"/>
        </label>
        <label>Local answer method
          <select value={model} disabled={busy}
            onChange={event => {setModel(event.target.value); setResult(null);}}>
            <option value="">Evidence excerpts only (works without Ollama)</option>
            {models.map(m => <option key={m} value={m}>Ollama · {m}</option>)}
          </select>
        </label>
        <p>When a local model is selected, the answer must cite the approved
          sources. If Ollama is offline, ungrounded, or over the answer limit,
          we see quoted source excerpts instead. No background model requests.</p>
        <SpeechToTextPanel disabled={busy}
          onTranscript={draft => {
            setQuestion(draft.slice(0, 600));
            setResult(null);
          }} />
        <button type="submit" className="primary-button"
          disabled={busy || selected.length === 0 || question.trim().length < 3}>
          {busy ? "Consulting approved sources…" : "Ask with approved evidence"}
        </button>
      </form>
    </section>

    {result && <section className="panel" aria-label="Private assistant answer">
      <h2>4. Verified source readback</h2>
      <p><strong>Result:</strong> {result.status.replaceAll("_", " ")}
        {" · "}Search: {result.retrievalMethod}
        {" · "}Local provider: {result.provider}</p>
      {result.context && <p>Reference: {result.context.name} ({result.context.kind}).
        Source registry only; physical identity and live status are unverified.</p>}
      <div className="private380-answer" role="status">{result.answer}</div>
      {result.citations.length > 0 && <>
        <h3>Supporting approved source excerpts</h3>
        <ol className="private380-citations">
          {result.citations.map(c => <li key={c.id + ":" + c.chunkId}>
            <strong>[{c.id}] {c.filename}</strong> {c.page ? " · page " + c.page : ""}
            {c.location ? " · " + c.location : ""}
            <blockquote>{c.quote}</blockquote>
          </li>)}
        </ol>
      </>}
      {result.status === "grounded" && <p>
        Citation identifiers were checked against the retrieved documents.
        That is not independent physical-safety certification.
      </p>}
      <div className="private380-buttons">
        <button type="button" disabled={!voice.available || busy}
          onClick={() => void voice.speak(380, result.answer)}>
          Read answer aloud locally
        </button>
        <button type="button" disabled={!voice.playing}
          onClick={voice.stop}>Stop voice</button>
      </div>
      <small role="status">{voice.availabilityMessage}</small>
      {voice.error && <p role="alert">{voice.error}</p>}
      <p>No equipment command, Home Assistant action, external message, or
        remote provider call was requested by this assistant.</p>
    </section>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
