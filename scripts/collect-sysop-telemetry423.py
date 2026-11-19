"""AIDP Build 423 explicit seven-source telemetry collector/relay.

No service installation or schedule is created here. The operator-controlled original host
may run this command after per-source URLs/tokens and AIDP intake authority are enrolled.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import sys
from typing import Any

import httpx

from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.seven_app_stats365 import APPS, verify_peer365
from rosevear_ai_hub.api.server_shell364 import protected_key364

TAG = {
    "ai-data-platform": "AIDP",
    "rosevear-ai-hub": "HUB",
    "rosevear-comms-hub": "COMMS",
    "yw": "YW",
    "icamp": "ICAMP",
    "rosiedazzlers": "ROSIE",
    "devilndove": "DEVIL",
}


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError("HOLD_SYSOP423_MISSING_" + name)
    return value


def collect_once(*, now_ms: int | None = None, transport: httpx.BaseTransport | None = None) -> dict[str, Any]:
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        raise ValueError("HOLD_SYSOP423_NOT_ORIGINAL_WINDOWS_HOST")
    intake_url = _required("ROSEVEAR_SYSOP423_AIDP_INTAKE_URL")
    intake_token = _required("ROSEVEAR_SYSOP423_AIDP_INTAKE_TOKEN")
    results = []
    accepted = 0
    forwarded = 0
    with httpx.Client(timeout=5.0, follow_redirects=False, transport=transport) as client:
        for app_id in APPS:
            tag = TAG[app_id]
            url = _required(f"ROSEVEAR_SYSOP423_{tag}_URL")
            token = _required(f"ROSEVEAR_SYSOP423_{tag}_TOKEN")
            commit = _required(f"ROSEVEAR_SYSOP365_{tag}_SOURCE_COMMIT")
            pin = _required(f"ROSEVEAR_SYSOP365_{tag}_PUBLIC_KEY_PIN")
            pem = protected_key364(_required(f"ROSEVEAR_SYSOP365_{tag}_PUBLIC_KEY_PATH"))
            try:
                response = client.get(
                    url,
                    headers={"x-rosevear-telemetry-token": token, "accept": "application/json"},
                )
                if response.status_code != 200:
                    results.append({"appId": app_id, "state": "HOLD_SOURCE_HTTP", "status": response.status_code})
                    continue
                if len(response.content) > 16_384:
                    results.append({"appId": app_id, "state": "HOLD_SOURCE_OVERSIZE"})
                    continue
                envelope = response.json()
                verified = verify_peer365(
                    envelope,
                    pem,
                    pin,
                    app_id,
                    commit,
                    now_ms if now_ms is not None else int(__import__("time").time() * 1000),
                )
                if not verified["accepted"]:
                    results.append({"appId": app_id, "state": verified["reason"]})
                    continue
                accepted += 1
                sent = client.post(
                    intake_url,
                    headers={
                        "x-rosevear-telemetry-token": intake_token,
                        "content-type": "application/json",
                    },
                    content=json.dumps(envelope, separators=(",", ":")),
                )
                if sent.status_code != 202:
                    results.append({"appId": app_id, "state": "HOLD_AIDP_INTAKE", "status": sent.status_code})
                    continue
                forwarded += 1
                results.append({"appId": app_id, "state": "SIGNED_SOURCE_FORWARDED"})
            except (httpx.HTTPError, ValueError, TypeError, KeyError, json.JSONDecodeError):
                results.append({"appId": app_id, "state": "HOLD_SOURCE_OR_INTAKE_FAILURE"})
    return {
        "schema": "rosevear.hub.sysop423.collector.v1",
        "acceptedSignedSources": accepted,
        "forwardedToAIDP": forwarded,
        "liveConnectedSources": 0,
        "physicalRebootsIndependentlyWitnessed": 0,
        "authorizesAction": False,
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="One explicit seven-app Build423 telemetry collection pass")
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    if not args.once:
        parser.exit(2, "HOLD_SYSOP423_EXPLICIT_ONCE_REQUIRED\n")
    try:
        print(json.dumps(collect_once(), separators=(",", ":")))
    except (ValueError, OSError) as error:
        message = str(error)
        if not message.startswith("HOLD_"):
            message = "HOLD_SYSOP423_COLLECTION_FAILED"
        parser.exit(2, message + "\n")


if __name__ == "__main__":
    main()
