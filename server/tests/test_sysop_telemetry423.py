import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from rosevear_ai_hub.api import sysop_telemetry423

CHALLENGE = "b" * 64


def test_build432_hub_source_is_v12_challenge_bound_signed_non_authorizing(
    tmp_path,
    monkeypatch,
):
    private = Ed25519PrivateKey.generate()
    key_path = tmp_path / "hub432.pem"
    key_path.write_bytes(
        private.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    monkeypatch.setenv(
        "ROSEVEAR_SYSOP_TELEMETRY_PRIVATE_KEY_PATH",
        str(key_path),
    )
    monkeypatch.setenv(
        "ROSEVEAR_SYSOP_TELEMETRY_SOURCE_COMMIT",
        "a" * 40,
    )
    monkeypatch.setattr(
        sysop_telemetry423.psutil,
        "boot_time",
        lambda: 1_799_999_000.0,
    )

    envelope = sysop_telemetry423.build_sysop_telemetry423(
        now_ms=1_800_000_000_000,
        machine_name="DESKTOP-AE894KC",
        windows_host=True,
        challenge=CHALLENGE,
    )
    payload = envelope["payload"]

    assert payload["protocolVersion"] == "1.2"
    assert payload["challenge"] == CHALLENGE
    assert payload["authorizesAction"] is False
    assert payload["sysop"]["bootTimeMs"] == 1_799_999_000_000
    assert payload["sysop"]["rebootIsIndependentlyWitnessed"] is False
    private.public_key().verify(
        bytes.fromhex(envelope["signature"]),
        sysop_telemetry423._canonical(payload),
    )


def test_build432_hub_source_fails_closed_off_original_host():
    with pytest.raises(
        ValueError,
        match="HOLD_SYSOP423_NOT_ORIGINAL_WINDOWS_HOST",
    ):
        sysop_telemetry423.build_sysop_telemetry423(
            now_ms=1_800_000_000_000,
            machine_name="CI-RUNNER",
            windows_host=False,
            challenge=CHALLENGE,
        )


def test_build432_hub_source_rejects_missing_challenge():
    with pytest.raises(
        ValueError,
        match="HOLD_SYSOP423_CHALLENGE_REQUIRED",
    ):
        sysop_telemetry423.build_sysop_telemetry423(
            now_ms=1_800_000_000_000,
            machine_name="DESKTOP-AE894KC",
            windows_host=True,
            challenge="bad",
        )
