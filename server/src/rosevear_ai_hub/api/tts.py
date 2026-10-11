"""Build 043 local-only Windows SAPI text-to-speech.

The authenticated caller explicitly requests an audio WAV. Neither supplied text
nor generated audio is retained in application storage or logs.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator

from rosevear_ai_hub.config import Settings, get_settings

router = APIRouter(prefix="/api/v1/tts", tags=["text-to-speech"])
TTSSettings = Annotated[Settings, Depends(get_settings)]
MAX_TEXT_CHARACTERS = 600
MAX_WAV_BYTES = 20 * 1024 * 1024


class VoiceStatus(BaseModel):
    available: bool
    engine: str = "windows_sapi"
    message: str
    max_text_characters: int = MAX_TEXT_CHARACTERS


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARACTERS)

    @field_validator("text")
    @classmethod
    def validate_text(cls, text: str) -> str:
        cleaned = text.strip()
        if not cleaned or any(
            ord(character) < 32 and character not in "\n\r\t" for character in cleaned
        ):
            raise ValueError("Speech text must be non-empty and contain no control characters.")
        return cleaned


def _engine(settings: Settings) -> str | None:
    if (
        not settings.tts_enabled
        or sys.platform != "win32"
        or not settings.tts_sapi_script_path.is_file()
    ):
        return None
    return shutil.which("powershell.exe")


@router.get("/status", response_model=VoiceStatus)
def tts_status(settings: TTSSettings) -> VoiceStatus:
    ready = _engine(settings) is not None
    return VoiceStatus(
        available=ready,
        message=(
            "Windows SAPI local speech playback is available."
            if ready
            else "Local speech playback requires enabled Windows SAPI and the TTS script."
        ),
    )


def _read_local_wav(path: Path) -> bytes:
    if not path.is_file() or not 44 <= path.stat().st_size <= MAX_WAV_BYTES:
        raise HTTPException(status_code=502, detail="Local voice engine returned invalid audio.")
    try:
        with wave.open(str(path), "rb") as audio:
            if (
                audio.getcomptype() != "NONE"
                or audio.getnchannels() not in (1, 2)
                or audio.getsampwidth() != 2
                or not 8000 <= audio.getframerate() <= 96000
                or audio.getnframes() <= 0
            ):
                raise ValueError("Unsupported audio format.")
    except (EOFError, OSError, ValueError, wave.Error) as exc:
        raise HTTPException(
            status_code=502, detail="Local voice engine returned invalid WAV."
        ) from exc
    return path.read_bytes()


@router.post("/synthesize")
def synthesize(request: SpeechRequest, settings: TTSSettings) -> Response:
    executable = _engine(settings)
    if executable is None:
        raise HTTPException(status_code=503, detail="Local Windows speech playback is unavailable.")
    with tempfile.TemporaryDirectory(prefix="rosevear-tts-") as temporary:
        work = Path(temporary)
        text_path = work / "input.txt"
        wav_path = work / "output.wav"
        text_path.write_text(request.text, encoding="utf-8")
        command = [
            executable,
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(settings.tts_sapi_script_path.resolve()),
            "-InputFile",
            str(text_path),
            "-OutputFile",
            str(wav_path),
        ]
        try:
            result = subprocess.run(  # noqa: S603 -- fixed trusted local interpreter, no shell
                command,
                capture_output=True,
                text=True,
                check=False,
                timeout=settings.tts_timeout_seconds,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise HTTPException(
                status_code=503, detail="Local voice engine unavailable or timed out."
            ) from exc
        if result.returncode != 0:
            raise HTTPException(status_code=502, detail="Local voice synthesis failed.")
        wav = _read_local_wav(wav_path)
        return Response(
            content=wav,
            media_type="audio/wav",
            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
        )
