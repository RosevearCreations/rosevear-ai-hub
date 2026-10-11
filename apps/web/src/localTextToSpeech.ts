import { useCallback, useEffect, useRef, useState } from "react";

import { getLocalTtsStatus, synthesizeLocalSpeech } from "./api";

export function speechExcerpt(text: string, maxCharacters = 600): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxCharacters) return trimmed;
  const preview = trimmed.slice(0, maxCharacters);
  const lastSpace = preview.lastIndexOf(" ");
  return lastSpace > maxCharacters / 2 ? preview.slice(0, lastSpace) : preview;
}

/** Only one audio clip is active in Chat. Audio URLs are revoked when stopped. */
export function useLocalTextToSpeech() {
  const [available, setAvailable] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("Checking local Windows voice…");
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const release = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    release();
    setPlaying(false);
    setActiveMessageId(null);
  }, [release]);

  useEffect(() => {
    const controller = new AbortController();
    getLocalTtsStatus(controller.signal)
      .then((result) => {
        setAvailable(result.available);
        setAvailabilityMessage(result.message);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAvailable(false);
          setAvailabilityMessage("Local voice status unavailable. Sign in and retry.");
        }
      });
    return () => {
      controller.abort();
      release();
    };
  }, [release]);

  const speak = useCallback(async (messageId: number, text: string) => {
    if (!available) return;
    stop();
    setError("");
    setActiveMessageId(messageId);
    setPlaying(false);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const blob = await synthesizeLocalSpeech(speechExcerpt(text), controller.signal);
      if (controller.signal.aborted) return;
      const objectUrl = URL.createObjectURL(blob);
      urlRef.current = objectUrl;
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      audio.onended = stop;
      audio.onerror = () => {
        setError("The browser could not play the local WAV audio.");
        stop();
      };
      await audio.play();
      if (!controller.signal.aborted) setPlaying(true);
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : "Local playback failed.");
        stop();
      }
    }
  }, [available, stop]);

  return { available, availabilityMessage, activeMessageId, playing, error, speak, stop };
}
