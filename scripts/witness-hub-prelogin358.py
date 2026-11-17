"""Build 358 / QL-467 external TLS witness (never run on original Hub PC).

A witness from an independent private-LAN client can record HTTPS health
checks across a supervised reboot. Hash chaining detects accidental edits, but
is NOT a signature, proof of Windows login-screen state, or owner authorization.
Only sanitized fields are written: no URL, credentials, response body or keys.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import ipaddress
import json
import secrets
import ssl
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener

SCHEMA = "rosevear.hub.ql467-external-witness358.v1"
ZERO = "0" * 64


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def endpoint_digest(url: str) -> str:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("HOLD_HTTPS_ENDPOINT_REQUIRED")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("HOLD_URL_CREDENTIALS_OR_QUERY_FORBIDDEN")
    if parsed.port is not None and not 1 <= parsed.port <= 65535:
        raise ValueError("HOLD_PORT_INVALID")
    hostname = parsed.hostname.casefold().strip(".")
    if hostname in {"localhost", "0.0.0.0"}:
        raise ValueError("HOLD_INDEPENDENT_CLIENT_REQUIRED")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        address = None
    if address and (address.is_loopback or address.is_unspecified):
        raise ValueError("HOLD_INDEPENDENT_CLIENT_REQUIRED")
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def probe(url: str, opener) -> tuple[bool, str]:
    try:
        with opener.open(Request(url, method="GET"), timeout=5) as response:
            return response.status == 200, "HTTP_200" if response.status == 200 else "HTTP_NON_200"
    except HTTPError:
        return False, "HTTP_NON_200"
    except ssl.SSLError:
        return False, "TLS_HOLD"
    except (URLError, OSError, TimeoutError):
        return False, "NETWORK_HOLD"


def chain_record(fields: dict, previous: str) -> dict:
    payload = {**fields, "previousSha256": previous}
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return {**payload, "sha256": hashlib.sha256(serialized).hexdigest()}


def verify_lines(lines: list[str]) -> dict:
    prior = ZERO
    samples = 0
    success = 0
    failed_before_success = False
    had_failure = False
    valid = bool(lines)
    endpoint = None
    nonce = None
    for index, line in enumerate(lines):
        try:
            record = json.loads(line)
            checksum = record.pop("sha256")
            if not isinstance(checksum, str) or record.get("previousSha256") != prior:
                valid = False
                break
            expected = chain_record(
                {key: value for key, value in record.items() if key != "previousSha256"},
                prior,
            )["sha256"]
            if not hmac.compare_digest(checksum, expected):
                valid = False
                break
            kind = record.get("kind")
            if index == 0:
                if kind != "START" or record.get("schema") != SCHEMA:
                    valid = False
                    break
                nonce = record.get("nonce")
                endpoint = record.get("endpointSha256")
                if not isinstance(nonce, str) or len(nonce) != 32 or not isinstance(endpoint, str) or len(endpoint) != 64:
                    valid = False
                    break
            else:
                if kind != "PROBE" or record.get("sequence") != index or not isinstance(record.get("ok"), bool):
                    valid = False
                    break
                samples += 1
                if record["ok"]:
                    success += 1
                    if had_failure:
                        failed_before_success = True
                else:
                    had_failure = True
            prior = checksum
        except (ValueError, TypeError, KeyError, json.JSONDecodeError):
            valid = False
            break
    return {
        "schema": SCHEMA,
        "chainIntact": valid,
        "probeCount": samples if valid else 0,
        "https200Count": success if valid else 0,
        "observedFailureThenSuccess": bool(valid and failed_before_success),
        "independentDigitalSignatureVerified": False,
        "operatorConfirmedWindowsRemainedAtLoginScreen": False,
        "physicalPreloginRecoveryProven": False,
        "masterPeerSignedAckVerified": False,
    }


def do_probe(url: str, output: Path, samples: int, interval: float, cafile: str | None) -> None:
    digest = endpoint_digest(url)
    if not 1 <= samples <= 720 or not 2 <= interval <= 60:
        raise ValueError("HOLD_BOUNDED_WITNESS_ARGUMENTS_REQUIRED")
    if output.exists():
        raise ValueError("HOLD_WITNESS_OUTPUT_ALREADY_EXISTS_NO_OVERWRITE")
    context = ssl.create_default_context(cafile=cafile)
    opener = build_opener(HTTPSHandler(context=context), NoRedirect)
    prior = ZERO
    with output.open("x", encoding="utf-8") as handle:
        start = chain_record(
            {
                "kind": "START",
                "schema": SCHEMA,
                "nonce": secrets.token_hex(16),
                "endpointSha256": digest,
                "utc": utc_now(),
                "signaturePresent": False,
            },
            prior,
        )
        handle.write(json.dumps(start, sort_keys=True) + "\n")
        handle.flush()
        prior = start["sha256"]
        try:
            for sequence in range(1, samples + 1):
                ok, status = probe(url, opener)
                record = chain_record(
                    {"kind": "PROBE", "sequence": sequence, "utc": utc_now(), "ok": ok, "status": status},
                    prior,
                )
                handle.write(json.dumps(record, sort_keys=True) + "\n")
                handle.flush()
                prior = record["sha256"]
                if sequence < samples:
                    time.sleep(interval)
        except KeyboardInterrupt:
            pass
    print(json.dumps(verify_lines(output.read_text(encoding="utf-8").splitlines()), sort_keys=True))


def self_test() -> None:
    for forbidden in ("http://example.com/health", "https://localhost/health", "https://127.0.0.1/health", "https://user:password@example.com/health"):
        try:
            endpoint_digest(forbidden)
            raise AssertionError("unsafe URL accepted")
        except ValueError:
            pass
    prior = ZERO
    records = []
    for data in (
        {"kind": "START", "schema": SCHEMA, "nonce": "a" * 32, "endpointSha256": "b" * 64, "utc": utc_now(), "signaturePresent": False},
        {"kind": "PROBE", "sequence": 1, "utc": utc_now(), "ok": False, "status": "NETWORK_HOLD"},
        {"kind": "PROBE", "sequence": 2, "utc": utc_now(), "ok": True, "status": "HTTP_200"},
    ):
        record = chain_record(data, prior)
        records.append(json.dumps(record, sort_keys=True))
        prior = record["sha256"]
    verified = verify_lines(records)
    assert verified["chainIntact"] and verified["observedFailureThenSuccess"]
    assert not verified["physicalPreloginRecoveryProven"]
    tampered = records.copy()
    tampered[1] = tampered[1].replace("NETWORK_HOLD", "HTTP_200")
    assert not verify_lines(tampered)["chainIntact"]
    with tempfile.TemporaryDirectory() as folder:
        f = Path(folder) / "witness.jsonl"
        f.write_text("\n".join(records) + "\n", encoding="utf-8")
        assert verify_lines(f.read_text(encoding="utf-8").splitlines())["probeCount"] == 2
    print("BUILD358_EXTERNAL_WITNESS_CHAIN_TEST_PASSED_NO_NETWORK")


def main() -> None:
    parser = argparse.ArgumentParser(description="External TLS health witness (unsigned)")
    sub = parser.add_subparsers(dest="action", required=True)
    p = sub.add_parser("probe")
    p.add_argument("--url", required=True)
    p.add_argument("--output", required=True, type=Path)
    p.add_argument("--samples", type=int, default=240)
    p.add_argument("--interval", type=float, default=5)
    p.add_argument("--cafile")
    v = sub.add_parser("verify")
    v.add_argument("--input", required=True, type=Path)
    sub.add_parser("self-test")
    args = parser.parse_args()
    try:
        if args.action == "self-test":
            self_test()
        elif args.action == "verify":
            data = args.input.read_text(encoding="utf-8")
            if len(data) > 12_000_000:
                raise ValueError("HOLD_WITNESS_FILE_TOO_LARGE")
            print(json.dumps(verify_lines(data.splitlines()), sort_keys=True))
        else:
            do_probe(args.url, args.output, args.samples, args.interval, args.cafile)
    except (OSError, ValueError) as exc:
        # Emit a bounded HOLD; never print private URL, cert location or token.
        reason = str(exc)
        if not reason.startswith("HOLD_"):
            reason = "HOLD_EXTERNAL_WITNESS_LOCAL_ERROR"
        parser.exit(2, reason + "\n")


if __name__ == "__main__":
    main()
