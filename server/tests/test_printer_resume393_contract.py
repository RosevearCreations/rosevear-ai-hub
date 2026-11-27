"""Source contract only; actual Windows task enrollment remains field unverified."""

from pathlib import Path


def test_printer_resume_reuses_existing_client():
    root = Path(__file__).resolve().parents[2]
    source = (root / "scripts/resume-printer-pc393.ps1").read_text(encoding="utf-8")
    assert "HOLD_EXISTING_ENROLLMENT" in source
    assert "HOLD_FIRST_SIGNED_RECEIPT_NOT_ACCEPTED" in source
    assert "HOLD_TRUSTED_CA_CHANGED" in source
    assert "-LogonType Interactive -RunLevel Limited" in source
    assert "-MultipleInstances IgnoreNew" in source
    assert "-RepetitionInterval (New-TimeSpan -Minutes 5)" in source
    assert "--init-key" not in source
    assert "pip install" not in source
    assert "Restart-Computer" not in source
    assert "preLoginRecoveryVerified = $false" in source
