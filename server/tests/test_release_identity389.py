import json

from rosevear_ai_hub import __version__
from rosevear_ai_hub.release_identity389 import read_marker389


def test_marker_is_exact_and_does_not_accept_version_only(tmp_path):
    path = tmp_path / "_release_identity389.json"
    assert read_marker389(path) is None
    path.write_text(json.dumps({"sha": "a" * 40, "version": __version__}))
    assert read_marker389(path) == "a" * 40
    path.write_text(json.dumps({"sha": "not-a-sha", "version": __version__}))
    assert read_marker389(path) is None
    path.write_text(json.dumps({"sha": "a" * 40, "version": "0.0.0"}))
    assert read_marker389(path) is None
