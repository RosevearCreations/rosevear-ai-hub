"""Build 042 privacy, audio boundary and local process tests."""

import io
import subprocess
import wave
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.config import Settings, get_settings
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def wav_audio(seconds: float = 1.0) -> bytes:
    sink = io.BytesIO()
    with wave.open(sink, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"\0\0" * int(16000 * seconds))
    return sink.getvalue()


def build_client(tmp_path, *, configured: bool = True):
    engine = build_engine(f"sqlite:///{tmp_path / 'speech.db'}")
    Base.metadata.create_all(engine)
    make_session = sessionmaker(bind=engine, expire_on_commit=False)
    binary = tmp_path / "whisper-cli.exe"
    model = tmp_path / "ggml-base.en.bin"
    if configured:
        binary.write_bytes(b"test binary")
        model.write_bytes(b"test model")

    def override_session():
        with make_session() as session:
            yield session

    settings = Settings(
        _env_file=None,
        SPEECH_EXECUTABLE_PATH=binary,
        SPEECH_MODEL_PATH=model,
        SPEECH_TIMEOUT_SECONDS=10,
    )
    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_settings] = lambda: settings
    return TestClient(application), binary


def sign_in(client):
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "twelve-characters-plus"},
    )
    assert response.status_code == 201


def test_speech_is_authenticated(tmp_path):
    client, _ = build_client(tmp_path)
    assert client.get("/api/v1/speech/status").status_code == 401
    assert client.post(
        "/api/v1/speech/transcribe",
        files={"audio": ("recording.wav", wav_audio(), "audio/wav")},
    ).status_code == 401


def test_disabled_when_binary_or_model_missing(tmp_path):
    client, _ = build_client(tmp_path, configured=False)
    sign_in(client)
    result = client.get("/api/v1/speech/status")
    assert result.status_code == 200
    assert result.json()["available"] is False
    response = client.post(
        "/api/v1/speech/transcribe",
        files={"audio": ("recording.wav", wav_audio(), "audio/wav")},
    )
    assert response.status_code == 503


def test_rejects_unsupported_audio_before_process_execution(tmp_path, monkeypatch):
    client, _ = build_client(tmp_path)
    sign_in(client)
    monkeypatch.setattr(
        "rosevear_ai_hub.api.speech.subprocess.run",
        lambda *a, **kw: (_ for _ in ()).throw(AssertionError("executed")),
    )
    samples = [
        (b"not a wav", "audio/wav", 422),
        (wav_audio(31), "audio/wav", 422),
        (b"x" * 1_100_001, "audio/wav", 413),
        (wav_audio(), "application/octet-stream", 415),
    ]
    for data, mime, expected in samples:
        response = client.post(
            "/api/v1/speech/transcribe", files={"audio": ("clip.wav", data, mime)}
        )
        assert response.status_code == expected


def test_transcribes_with_local_cli_and_cleans_temp_audio(tmp_path, monkeypatch):
    client, binary = build_client(tmp_path)
    sign_in(client)
    scratch = []

    def local_cli(args, **kwargs):
        assert args[0] == str(binary.resolve())
        assert args[1] == "-m"
        assert args[3] == "-f"
        scratch.append(Path(args[4]).parent)
        assert Path(args[4]).is_file()
        assert kwargs["timeout"] == 10
        assert "shell" not in kwargs
        out = Path(args[args.index("-of") + 1] + ".txt")
        out.write_text("  Turn on the workshop lights  ", encoding="utf-8")
        return subprocess.CompletedProcess(args, 0)

    monkeypatch.setattr("rosevear_ai_hub.api.speech.subprocess.run", local_cli)
    assert client.get("/api/v1/speech/status").json()["available"] is True
    response = client.post(
        "/api/v1/speech/transcribe",
        files={"audio": ("clip.wav", wav_audio(), "audio/wav")},
    )
    assert response.status_code == 200
    assert response.json() == {
        "text": "Turn on the workshop lights",
        "engine": "whisper.cpp",
    }
    assert scratch and not scratch[0].exists()


def test_cli_failure_is_sanitized_and_audio_is_removed(tmp_path, monkeypatch):
    client, _ = build_client(tmp_path)
    sign_in(client)
    scratch = []

    def failing_cli(args, **kwargs):
        scratch.append(Path(args[args.index("-f") + 1]).parent)
        return subprocess.CompletedProcess(args, 1, stderr="private device path")

    monkeypatch.setattr("rosevear_ai_hub.api.speech.subprocess.run", failing_cli)
    response = client.post(
        "/api/v1/speech/transcribe",
        files={"audio": ("clip.wav", wav_audio(), "audio/wav")},
    )
    assert response.status_code == 502
    assert "private device path" not in response.text
    assert scratch and not scratch[0].exists()
