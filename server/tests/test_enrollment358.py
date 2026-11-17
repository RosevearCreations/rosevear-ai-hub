"""Build 358 independent three-Master enrollment gates remain CLOSED by default."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / "docs" / "contracts" / "ql467-three-master-enrollment358.json"


def test_original_host_authority_is_not_invented_by_source():
    manifest = json.loads(POLICY.read_text(encoding="utf-8"))
    assert manifest["schema"] == "rosevear.hub.ql467.master-enrollment358.v1"
    assert manifest["originalHost"] == "DESKTOP-AE894KC"
    assert manifest["sourceOnly"] is True
    assert manifest["globalProductionReady"] is False
    assert manifest["changesMade"] is False
    assert manifest["lockstepReleaseRequired"] is False
    hub = manifest["hub"]
    assert hub["exactTaskIdentityVerified"]
    assert not hub["tasksEnabled"]
    assert not hub["physicalPreloginBootProven"]
    for name in ("aiDataPlatform", "commsHub"):
        peer = manifest[name]
        assert not peer["autoStartAuthorized"]
        assert not peer["ownerAndCustodianApprovalsVerified"]
        assert not peer["independentMtlSAndSignedAckVerified"]
        assert not peer["windowsServiceDetectedOnHost"]
    assert manifest["commsHub"]["privateQL340CTestReceiver"].startswith("OFF_")
