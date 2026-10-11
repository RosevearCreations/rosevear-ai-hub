"""Build 043 authenticated local TTS guard, audio and privacy regression tests."""

import io
import subprocess
import wave
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api import tts
from rosevear_ai_hub.config import Settings, get_settings
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def make_wav() -> bytes:
    stream = io.BytesIO()
    with wave.open(stream, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"\0\0" * 1600)
    return stream.getvalue()


def client_for(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'tts.db'}")
    Base.metadata.create_all(engine)
    make_session = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with make_session() as session:
            yield session

    script = tmp_path / "tts-sapi.ps1"
    script.write_text("test", encoding="utf-8")
    settings = Settings(_env_file=None, TTS_SAPI_SCRIPT_PATH=script, TTS_TIMEOUT_SECONDS=15)
    app = create_app()
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_settings] = lambda: settings
    return TestClient(app)


def authenticate(client):
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "localowner", "password": "long-test-passphrase"},
    )
    assert response.status_code == 201


def test_speech_endpoints_require_login_even_before_bootstrap(tmp_path):
    client = client_for(tmp_path)
    assert client.get("/api/v1/tts/status").status_code == 401
    assert client.post("/api/v1/tts/synthesize", json={"text": "Hello"}).status_code == 401


def test_unavailable_engine_fails_closed(tmp_path, monkeypatch):
    client = client_for(tmp_path)
    authenticate(client)
    monkeypatch.setattr(tts, "_engine", lambda settings: None)
    assert client.get("/api/v1/tts/status").json()["available"] is False
    response = client.post("/api/v1/tts/synthesize", json={"text": "Hello."})
    assert response.status_code == 503


def test_bounded_request_never_invokes_engine(tmp_path, monkeypatch):
    client = client_for(tmp_path)
    authenticate(client)
    monkeypatch.setattr(tts, "_engine", lambda settings: "powershell.exe")
    monkeypatch.setattr(
        tts.subprocess,
        "run",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("should not execute")),
    )
    for text in [" ", "x" * 601, "\0Hello"]:
        assert client.post("/api/v1/tts/synthesize", json={"text": text}).status_code == 422


def test_windows_sapi_wav_and_temporary_file_cleanup(tmp_path, monkeypatch):
    client = client_for(tmp_path)
    authenticate(client)
    monkeypatch.setattr(tts, "_engine", lambda settings: "powershell.exe")
    saved = []

    def mock_run(args, **options):
        assert args[0] == "powershell.exe"
        assert "-File" in args and "-InputFile" in args and "-OutputFile" in args
        assert "Personal spoken content" not in " ".join(args)
        assert options["timeout"] == 15
        assert options["check"] is False
        assert "shell" not in options
        input_file = Path(args[args.index("-InputFile") + 1])
        output = Path(args[args.index("-OutputFile") + 1])
        assert input_file.read_text(encoding="utf-8") == "Personal spoken content"
        output.write_bytes(make_wav())
        saved.append(input_file.parent)
        return subprocess.CompletedProcess(args, 0)

    monkeypatch.setattr(tts.subprocess, "run", mock_run)
    assert client.get("/api/v1/tts/status").json()["available"] is True
    response = client.post("/api/v1/tts/synthesize", json={"text": "Personal spoken content"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.headers["cache-control"] == "no-store"
    assert response.content == make_wav()
    assert saved and not saved[0].exists()


def test_synthesis_errors_sanitize_stderr_and_remove_files(tmp_path, monkeypatch):
    client = client_for(tmp_path)
    authenticate(client)
    monkeypatch.setattr(tts, "_engine", lambda settings: "powershell.exe")
    saved = []

    def mock_run(args, **options):
        saved.append(Path(args[args.index("-InputFile") + 1]).parent)
        return subprocess.CompletedProcess(args, 1, stderr="private voice data")

    monkeypatch.setattr(tts.subprocess, "run", mock_run)
    result = client.post("/api/v1/tts/synthesize", json={"text": "Private"})
    assert result.status_code == 502
    assert "private voice data" not in result.text
    assert saved and not saved[0].exists()


def test_rejects_invalid_wav_output(tmp_path, monkeypatch):
    client = client_for(tmp_path)
    authenticate(client)
    monkeypatch.setattr(tts, "_engine", lambda settings: "powershell.exe")

    def mock_run(args, **options):
        output = Path(args[args.index("-OutputFile") + 1])
        output.write_bytes(b"x" * 50)
        return subprocess.CompletedProcess(args, 0)

    monkeypatch.setattr(tts.subprocess, "run", mock_run)
    assert client.post("/api/v1/tts/synthesize", json={"text": "Hello"}).status_code == 502
