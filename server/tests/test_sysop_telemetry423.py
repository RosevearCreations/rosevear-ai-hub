import hashlib
from pathlib import Path

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from rosevear_ai_hub.api import sysop_telemetry423


def test_build423_hub_source_is_signed_non_authorizing_and_boot_is_only_observed(tmp_path, monkeypatch):
    private = Ed25519PrivateKey.generate()
    key_path = tmp_path / "hub423.pem"
    key_path.write_bytes(
        private.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    monkeypatch.setenv("ROSEVEAR_SYSOP_TELEMETRY_PRIVATE_KEY_PATH", str(key_path))
    monkeypatch.setenv("ROSEVEAR_SYSOP_TELEMETRY_SOURCE_COMMIT", "a" * 40)
    monkeypatch.setattr(sysop_telemetry423.psutil, "boot_time", lambda: 1_799_999_000.0)
    envelope = sysop_telemetry423.build_sysop_telemetry423(
        now_ms=1_800_000_000_000,
        machine_name="DESKTOP-AE894KC",
        windows_host=True,
    )
    payload = envelope["payload"]
    assert payload["appId"] == "rosevear-ai-hub"
    assert payload["tenantId"] is None
    assert payload["authorizesAction"] is False
    assert payload["sysop"]["bootTimeMs"] == 1_799_999_000_000
    assert payload["sysop"]["rebootIsIndependentlyWitnessed"] is False
    private.public_key().verify(bytes.fromhex(envelope["signature"]), sysop_telemetry423._canonical(payload))


def test_build423_hub_source_fails_closed_off_original_host(monkeypatch):
    monkeypatch.delenv("ROSEVEAR_SYSOP_TELEMETRY_PRIVATE_KEY_PATH", raising=False)
    with pytest.raises(ValueError, match="HOLD_SYSOP423_NOT_ORIGINAL_WINDOWS_HOST"):
        sysop_telemetry423.build_sysop_telemetry423(
            now_ms=1_800_000_000_000,
            machine_name="CI-RUNNER",
            windows_host=False,
        )
