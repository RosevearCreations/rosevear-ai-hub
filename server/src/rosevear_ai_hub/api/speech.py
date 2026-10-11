"""Opt-in, local-only PCM WAV transcription with whisper.cpp.

Audio and transcripts never leave the machine or enter persistent storage.
No executable or model is downloaded automatically.
"""

from __future__ import annotations

import io
import subprocess
import tempfile
import wave
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from rosevear_ai_hub.config import Settings, get_settings

router = APIRouter(prefix="/api/v1/speech", tags=["speech"])
SpeechSettings = Annotated[Settings, Depends(get_settings)]
SpeechUpload = Annotated[UploadFile, File(...)]
MAX_WAV_BYTES = 1_100_000
MAX_DURATION_SECONDS = 30
REQUIRED_SAMPLE_RATE = 16000


class SpeechStatus(BaseModel):
    available: bool
    engine: str = "whisper.cpp"
    message: str
    max_duration_seconds: int = MAX_DURATION_SECONDS


class TranscriptionResponse(BaseModel):
    text: str
    engine: str = "whisper.cpp"


def _available(settings: Settings) -> bool:
    return settings.speech_executable_path.is_file() and settings.speech_model_path.is_file()


@router.get("/status", response_model=SpeechStatus)
def speech_status(settings: SpeechSettings) -> SpeechStatus:
    enabled = _available(settings)
    return SpeechStatus(
        available=enabled,
        message=(
            "Local speech recognition is ready."
            if enabled
            else "Install whisper-cli and a local GGML model; see docs/BUILD_042_LOCAL_STT.md."
        ),
    )


def _validate_wav(data: bytes) -> None:
    try:
        with wave.open(io.BytesIO(data), "rb") as wav:
            if (
                wav.getnchannels() != 1
                or wav.getsampwidth() != 2
                or wav.getframerate() != REQUIRED_SAMPLE_RATE
                or wav.getcomptype() != "NONE"
            ):
                raise ValueError("unsupported WAV format")
            if not 0 < wav.getnframes() <= MAX_DURATION_SECONDS * REQUIRED_SAMPLE_RATE:
                raise ValueError("invalid WAV duration")
            if wav.getnframes() * 2 > len(data):
                raise ValueError("truncated WAV")
            # Ensure the declared sample count can actually be read.
            if len(wav.readframes(wav.getnframes())) != wav.getnframes() * 2:
                raise ValueError("truncated audio")
    except (EOFError, ValueError, wave.Error) as exc:
        raise HTTPException(
            status_code=422, detail="Audio must be PCM 16-bit mono, 16 kHz WAV, up to 30 seconds."
        ) from exc


@router.post("/transcribe", response_model=TranscriptionResponse)
def transcribe(
    audio: SpeechUpload,
    settings: SpeechSettings,
) -> TranscriptionResponse:
    if not _available(settings):
        raise HTTPException(
            status_code=503, detail="Local speech engine or model is not installed."
        )
    if audio.content_type not in ("audio/wav", "audio/x-wav", "audio/wave"):
        raise HTTPException(status_code=415, detail="Only local PCM WAV audio is supported.")

    # Bounded read, no request body or audio ever logged or saved beyond the temporary directory.
    data = audio.file.read(MAX_WAV_BYTES + 1)
    if not data or len(data) > MAX_WAV_BYTES:
        raise HTTPException(status_code=413, detail="Audio upload is empty or exceeds the limit.")
    _validate_wav(data)

    with tempfile.TemporaryDirectory(prefix="rosevear-stt-") as work:
        source = Path(work) / "clip.wav"
        transcript_base = Path(work) / "transcript"
        source.write_bytes(data)
        command = [
            str(settings.speech_executable_path.resolve()),
            "-m",
            str(settings.speech_model_path.resolve()),
            "-f",
            str(source),
            "-nt",
            "-otxt",
            "-of",
            str(transcript_base),
        ]
        try:
            result = subprocess.run(  # noqa: S603 -- fixed local executable, argument list, no shell
                command,
                capture_output=True,
                text=True,
                timeout=settings.speech_timeout_seconds,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise HTTPException(
                status_code=503, detail="Local transcription unavailable or timed out."
            ) from exc
        transcript_path = transcript_base.with_suffix(".txt")
        if result.returncode != 0 or not transcript_path.is_file():
            raise HTTPException(
                status_code=502,
                detail="Local speech recognition failed. Check the installed model.",
            )
        transcript = transcript_path.read_text(encoding="utf-8").strip()
        if not transcript or len(transcript) > 8000:
            raise HTTPException(status_code=422, detail="No usable speech was recognized.")
        return TranscriptionResponse(text=transcript)
