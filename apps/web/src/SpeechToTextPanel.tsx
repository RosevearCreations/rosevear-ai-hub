import { useEffect, useRef, useState } from "react";

import { getSpeechStatus, transcribeLocalWav, type SpeechStatusResponse } from "./api";
import { startLocalMicrophone, type MicrophoneSession } from "./audioCapture";

/** Transcription prepares editable text; it never submits a chat message or action. */
export function SpeechToTextPanel({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled: boolean;
}) {
  const [engine, setEngine] = useState<SpeechStatusResponse | null>(null);
  const [mode, setMode] = useState<"idle" | "recording" | "transcribing">("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const recorderRef = useRef<MicrophoneSession | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  function refresh() {
    getSpeechStatus()
      .then(setEngine)
      .catch(() => setEngine({
        available: false,
        engine: "whisper.cpp",
        message: "Speech service unavailable.",
        max_duration_seconds: 30,
      }));
  }

  useEffect(() => {
    const controller = new AbortController();
    getSpeechStatus(controller.signal)
      .then(setEngine)
      .catch(() => {
        if (!controller.signal.aborted) {
          setEngine({ available: false, engine: "whisper.cpp", message: "Speech service offline.", max_duration_seconds: 30 });
        }
      });
    return () => {
      controller.abort();
      recorderRef.current?.cancel();
      requestRef.current?.abort();
    };
  }, []);

  async function start() {
    if (disabled || !engine?.available) return;
    setNotice("");
    setError("");
    try {
      recorderRef.current = await startLocalMicrophone(() => void finish(), 20);
      setMode("recording");
    } catch (caught) {
      setMode("idle");
      setError(caught instanceof Error ? caught.message : "Microphone permission denied.");
    }
  }

  async function finish() {
    if (!recorderRef.current) return;
    const session = recorderRef.current;
    recorderRef.current = null;
    setMode("transcribing");
    try {
      const wav = session.stop();
      const controller = new AbortController();
      requestRef.current = controller;
      const text = await transcribeLocalWav(wav, controller.signal);
      onTranscript(text);
      setNotice("Transcript added to your message. Review and edit before sending.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to transcribe audio.");
    } finally {
      requestRef.current = null;
      setMode("idle");
    }
  }

  function cancel() {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    requestRef.current?.abort();
    setMode("idle");
    setNotice("Recording discarded.");
  }

  return (
    <div className="speech-panel" aria-label="Local speech to text">
      <div className="speech-actions">
        {mode === "recording" ? (
          <>
            <button type="button" onClick={() => void finish()}>Stop and transcribe</button>
            <button type="button" onClick={cancel}>Discard recording</button>
          </>
        ) : mode === "transcribing" ? (
          <button type="button" onClick={cancel}>Cancel transcription</button>
        ) : (
          <button type="button" onClick={() => void start()} disabled={disabled || !engine?.available}>
            Record locally (20 seconds max)
          </button>
        )}
        <button type="button" onClick={refresh} disabled={mode !== "idle"}>Check speech setup</button>
      </div>
      <small className="speech-info" role="status">
        {mode === "recording"
          ? "Microphone recording on this device; stop to transcribe."
          : mode === "transcribing"
            ? "Transcribing with your local Whisper model…"
            : engine?.message ?? "Checking local speech model…"}
      </small>
      {notice ? <p className="chat-notice" role="status">{notice}</p> : null}
      {error ? <p className="chat-error" role="alert">{error}</p> : null}
      <small className="speech-info">
        Microphone access is optional. No cloud speech service. Audio is discarded after local processing;
        recognized text stays editable until you press Send.
      </small>
    </div>
  );
}
