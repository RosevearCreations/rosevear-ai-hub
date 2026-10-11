import { useEffect, useRef, useState } from "react";

import {
  controlHomeAssistantEntity,
  previewVoiceCommand,
  type VoiceCommandPreview,
} from "./api";

/**
 * Voice transcripts are held separately from the ordinary Chat composer.
 * Nothing is sent to Chat or a physical device without another explicit click.
 */
export function VoiceCommandPanel({
  draft,
  disabled,
  onDraftChange,
  onUseAsChat,
}: {
  draft: string;
  disabled: boolean;
  onDraftChange: (text: string) => void;
  onUseAsChat: (text: string) => void;
}) {
  const [preview, setPreview] = useState<VoiceCommandPreview | null>(null);
  const [reviewed, setReviewed] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const confirmingRef = useRef(false);

  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPreview(null);
    setReviewed("");
  }, [draft]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const sameText = draft.trim() === reviewed;
  const approved =
    preview?.executable === true &&
    preview.entity_id !== null &&
    preview.action !== null &&
    sameText &&
    !disabled;

  async function review() {
    const text = draft.trim();
    if (!text || disabled || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    setPreview(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await previewVoiceCommand(text, controller.signal);
      if (!controller.signal.aborted) {
        setReviewed(text);
        setPreview(result);
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : "Unable to review voice input.");
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setBusy(false);
    }
  }

  async function confirm() {
    if (!approved || !preview || !preview.entity_id || !preview.action || confirmingRef.current) {
      return;
    }
    // One click may issue only one action request. No automatic retries on uncertain outcomes.
    confirmingRef.current = true;
    setBusy(true);
    setError("");
    const entity = preview.entity_id;
    const action = preview.action;
    setPreview(null);
    try {
      const result = await controlHomeAssistantEntity(entity, action);
      setNotice(
        result.accepted
          ? "Confirmed action executed and audited. " + result.entity_id + " (" + result.action + ")."
          : "The action was not accepted.",
      );
      onDraftChange("");
    } catch (caught) {
      setError(
        (caught instanceof Error ? caught.message : "Action failed.") +
          " Do not retry automatically; inspect the device state first.",
      );
    } finally {
      confirmingRef.current = false;
      setBusy(false);
    }
  }

  function useAsChat() {
    if (!preview || !sameText || preview.status !== "not_home_command" || disabled || busy) return;
    onUseAsChat(draft.trim());
    onDraftChange("");
  }

  return (
    <section className="voice-command-panel" aria-label="Voice command review">
      <h3>Review spoken words</h3>
      <p>Speech is a draft, not a command. Review the exact words before proceeding.</p>
      <label htmlFor="voice-command-draft">Recognized words</label>
      <textarea
        id="voice-command-draft"
        rows={2}
        maxLength={300}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        disabled={disabled || busy}
        placeholder="Record locally above, or type a single command to review."
      />
      <div className="speech-actions">
        <button type="button" onClick={() => void review()} disabled={!draft.trim() || disabled || busy}>
          {busy ? "Checking…" : "Review voice command"}
        </button>
        <button
          type="button"
          onClick={useAsChat}
          disabled={disabled || busy || !sameText || preview?.status !== "not_home_command"}
        >
          Move question to Chat
        </button>
        <button type="button" onClick={() => onDraftChange("")} disabled={!draft || disabled || busy}>
          Discard words
        </button>
      </div>
      {preview ? (
        <div className="voice-preview" role="status">
          <strong>{preview.executable ? "Confirmation required" : "Not executable"}</strong>
          <p>{preview.message}</p>
          {preview.executable ? (
            <>
              <p>
                Exact target: <strong>{preview.friendly_name}</strong> ({preview.entity_id})
                {" · "}Action: <strong>{preview.action}</strong>
              </p>
              <button type="button" onClick={() => void confirm()} disabled={!approved || busy}>
                Confirm exact action
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="chat-error" role="alert">{error}</p> : null}
      {notice ? <p className="chat-notice" role="status">{notice}</p> : null}
      <small>
        Only one exact allow-listed light, switch or scene is eligible.
        Bulk, unsafe, ambiguous and unapproved actions never execute through voice review.
      </small>
    </section>
  );
}
