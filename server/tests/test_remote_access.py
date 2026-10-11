"""Build 046 private production web origin, auth cookies and isolation tests."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.config import Settings
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def test_same_origin_web_assets_and_api_are_accessible(tmp_path, monkeypatch):
    public = tmp_path / "web"
    public.mkdir()
    (public / "index.html").write_text("<title>Private Hub</title>", encoding="utf-8")
    (public / "manifest.webmanifest").write_text('{"display":"standalone"}', encoding="utf-8")
    (public / "sw.js").write_text("/* public service worker */", encoding="utf-8")
    (tmp_path / ".env").write_text("SECRET=not-for-browser", encoding="utf-8")
    settings = Settings(_env_file=None, REMOTE_WEB_DIST_DIR=public)
    monkeypatch.setattr("rosevear_ai_hub.main.get_settings", lambda: settings)

    client = TestClient(create_app(), base_url="https://hub.example-tailnet.ts.net")
    assert client.get("/").status_code == 200
    assert "Private Hub" in client.get("/").text
    assert client.get("/manifest.webmanifest").status_code == 200
    assert client.get("/sw.js").status_code == 200
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/version").json()["version"] == "0.0.46"
    assert client.get("/.env").status_code == 404
    assert client.get("/api/v1/speech/status").status_code == 401


def test_static_app_can_be_disabled(tmp_path, monkeypatch):
    (tmp_path / "index.html").write_text("private static landing", encoding="utf-8")
    settings = Settings(_env_file=None, REMOTE_WEB_DIST_DIR=tmp_path, REMOTE_WEB_ENABLED=False)
    monkeypatch.setattr("rosevear_ai_hub.main.get_settings", lambda: settings)
    assert TestClient(create_app()).get("/").status_code == 404


def test_https_cookie_is_secure_and_localhost_cookie_stays_compatible(tmp_path, monkeypatch):
    public = tmp_path / "dist"
    public.mkdir()
    (public / "index.html").write_text("Hub", encoding="utf-8")
    engine = build_engine(f"sqlite:///{tmp_path / 'remote-auth.db'}")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with session_factory() as session:
            yield session

    settings = Settings(_env_file=None, REMOTE_WEB_DIST_DIR=public)
    monkeypatch.setattr("rosevear_ai_hub.main.get_settings", lambda: settings)
    monkeypatch.setattr("rosevear_ai_hub.auth.get_settings", lambda: settings)
    app = create_app()
    app.dependency_overrides[get_session] = override_session
    https = TestClient(app, base_url="https://hub.tailnet.ts.net")
    bootstrap = https.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "secure-passphrase-123"},
    )
    assert bootstrap.status_code == 201
    cookie = bootstrap.headers["set-cookie"].lower()
    assert "secure" in cookie and "httponly" in cookie and "samesite=strict" in cookie
    assert https.get("/api/v1/auth/me").status_code == 200
    https.post("/api/v1/auth/logout")

    local = TestClient(app, base_url="http://127.0.0.1:8765")
    login = local.post(
        "/api/v1/auth/login",
        json={"username": "owner", "password": "secure-passphrase-123"},
    )
    assert login.status_code == 200
    assert "secure" not in login.headers["set-cookie"].lower()
    assert local.get("/api/v1/auth/me").status_code == 200
