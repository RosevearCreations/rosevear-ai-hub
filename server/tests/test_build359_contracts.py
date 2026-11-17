"""Build 359 source-contract protections: branch audit, witness, peer custody."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "scripts"
THEMES = ROOT / ".github" / "rosevear-master-themes.v2.json"


def source(name: str) -> str:
    return (SCRIPTS / name).read_text(encoding="utf-8")


def test_shared_sixteen_theme_contract_preserves_read_only_authority():
    catalog = json.loads(THEMES.read_text(encoding="utf-8"))
    assert catalog["schema"] == "rosevear.master-themes.v2"
    assert catalog["presentationOnly"] is True
    assert catalog["authorityTransfer"] is False
    assert catalog["build417Extension"]["sharedThemeCount"] == 12
    assert catalog["build359Extension"]["sharedThemeCount"] == 16
    assert catalog["build359Extension"]["sameCatalogueForAllMasters"]
    assert catalog["build359Extension"]["newThemeIds"] == [
        "aurora",
        "amber-night",
        "orchid",
        "daylight",
    ]
    assert len(catalog["themeIds"]) == len(catalog["themes"]) == 16
    assert len(set(catalog["themeIds"])) == 16
    assert catalog["masters"] == ["ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub"]


def test_branch_auditor_cannot_delete_or_force_merge():
    script = source("audit-remote-branches359.ps1")
    for marker in (
        "SAFE_MERGED",
        "KEEP_PROTECTED",
        "HOLD_UNMERGED",
        "HOLD_UNKNOWN",
        "merge-base --is-ancestor",
        "refs/remotes/origin/main",
        "changesMade=$false",
    ):
        assert marker in script
    for forbidden in (
        "push origin --delete",
        "branch -D",
        "Remove-Item",
        "Update-Ref",
        "git reset",
        "git merge --",
        "Unregister-ScheduledTask",
    ):
        assert forbidden not in script


def test_signed_claim_cannot_self_authorize_and_does_not_store_secrets():
    verifier = source("verify-signed-prelogin-witness359.py")
    reconcile = source("reconcile-original-host359.py")
    for marker in (
        "Ed25519PublicKey",
        "HOLD_PUBLIC_KEY_FINGERPRINT_MISMATCH",
        "HOLD_ED25519_SIGNATURE_INVALID",
        "HOLD_SIGNED_WITNESS_NONCE_MISMATCH",
        "HOLD_UNTRUSTED_SOURCE_COMMIT",
        "HOLD_WITNESS_OBSERVATION_TIME_MISMATCH",
        '"physicalProductionGreen": False',
    ):
        assert marker in verifier
    for marker in (
        '"physicalUnattendedAndThreeMasterProductionGreen": False',
        '"commsQl340cPrivateReceiverAuthorized": False',
        '"aiDataPlatformWorkerInstalledAndSignedAckVerified": False',
        '"commsHubNonReceiverWorkerInstalledAndSignedAckVerified": False',
    ):
        assert marker in reconcile
    for forbidden in (
        "Ed25519PrivateKey.generate(",
        "Register-ScheduledTask",
        "Enable-ScheduledTask",
        "Restart-Computer",
        "ql340c-windows-operator.ps1 -Start",
    ):
        assert forbidden not in verifier
        assert forbidden not in reconcile
