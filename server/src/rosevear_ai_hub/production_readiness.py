"""Build 051 — read-only release readiness checks against loopback API only.

The smoke check neither authenticates nor touches household devices or data.
It must never follow redirects or contact an arbitrary supplied host.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

import httpx

from rosevear_ai_hub import __version__

LOOPBACK_API = "http://127.0.0.1:8765"
PATHS = (
    "/health",
    "/version",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/auth/me",
    "/api/v1/system/resource-budget",
)


def check_readiness(
    get: Callable[[str], httpx.Response], expected_version: str = __version__
) -> dict[str, object]:
    """Inspect only fixed, safe GET routes; never include returned response bodies."""
    observations: dict[str, httpx.Response | None] = {}
    for path in PATHS:
        try:
            response = get(path)
            # Redirects are NOT allowed to be followed, including off-machine URLs.
            observations[path] = response
        except (httpx.RequestError, ValueError, OSError):
            observations[path] = None

    def success(path: str, expected_status: int) -> bool:
        response = observations[path]
        return response is not None and response.status_code == expected_status

    def payload_ok(path: str, field: str, value: str) -> bool:
        response = observations[path]
        if response is None or response.status_code != 200:
            return False
        try:
            payload = response.json()
        except (ValueError, UnicodeError):
            return False
        return isinstance(payload, dict) and payload.get(field) == value

    def protected(path: str) -> bool:
        response = observations[path]
        return (
            response is not None
            and response.status_code == 401
            and response.headers.get("cache-control", "").lower() == "no-store"
            and response.headers.get("x-frame-options", "").upper() == "DENY"
            and response.headers.get("x-content-type-options", "").lower() == "nosniff"
            and response.headers.get("referrer-policy", "").lower() == "no-referrer"
        )

    checks = {
        "health_online": success("/health", 200)
        and payload_ok("/health", "status", "ok")
        and payload_ok("/health", "service", "Rosevear AI Hub"),
        "expected_version": success("/version", 200)
        and payload_ok("/version", "version", expected_version)
        and payload_ok("/version", "service", "Rosevear AI Hub"),
        "no_http_api_documentation": all(
            success(path, 404) for path in ("/docs", "/redoc", "/openapi.json")
        ),
        "unauthenticated_user_is_denied": protected("/api/v1/auth/me"),
        "unauthenticated_resources_are_denied": protected(
            "/api/v1/system/resource-budget"
        ),
    }
    return {
        "schema_version": 1,
        "build": 51,
        "expected_version": expected_version,
        "status": "pass" if all(checks.values()) else "fail",
        "checked_at_utc": datetime.now(UTC).isoformat(),
        "checks": checks,
        # No CI or loopback probe proves household firewall, CA or Tailscale ACLs.
        "lan_tailnet_acceptance": "not_tested",
        "household_recovery_acceptance": "not_tested",
        "service_changes_made": False,
    }


def write_evidence(path: Path, result: dict[str, object]) -> None:
    """Never replace or symlink-follow an existing report or reveal its contents."""
    if path.is_symlink() or path.exists() or not path.parent.is_dir():
        raise ValueError("Evidence must be a new file in an existing directory.")
    with path.open("x", encoding="utf-8") as output:
        json.dump(result, output, sort_keys=True, indent=2)
        output.write("\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Build 051: read-only, unauthenticated, loopback-only release smoke check"
    )
    parser.add_argument("--evidence", type=Path, help="Exclusive-create metadata-only JSON")
    args = parser.parse_args(argv)
    # Fail before making requests if the evidence destination cannot be safely written.
    if args.evidence is not None and (
        args.evidence.is_symlink()
        or args.evidence.exists()
        or not args.evidence.parent.is_dir()
    ):
        print("Readiness refused: evidence path unavailable.", file=sys.stderr)
        return 2
    try:
        with httpx.Client(
            base_url=LOOPBACK_API,
            trust_env=False,
            follow_redirects=False,
            timeout=2.0,
        ) as client:
            result = check_readiness(client.get)
        if args.evidence is not None:
            write_evidence(args.evidence, result)
    except (OSError, ValueError):
        print("Readiness refused: could not save evidence.", file=sys.stderr)
        return 2
    print(
        f"Build 051 local API readiness: {result['status'].upper()} "
        f"({sum(result['checks'].values())}/{len(result['checks'])} checks)."
    )
    print("LAN/Tailscale permissions and real-backup restore still require operator acceptance.")
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
