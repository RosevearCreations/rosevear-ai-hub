#!/usr/bin/env python3
"""Opt-in Windows printer-PC inventory and signed private Hub delivery.

Never opens an occupied COM port, sends G-code, operates a laser, starts jobs,
or captures cameras. Optional OctoPrint is local GET-only and opt-in.
"""
from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import os
import re
import secrets
import ssl
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener, urlopen

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

SCHEMA = "rosevear.hub.workshop-gateway.v370"
NOTES = (
    ("creality", "Creality printer model to verify"),
    ("ortur", "Ortur Laser Master 3"),
    ("epson-a", "Epson printer A model to verify"),
    ("epson-b", "Epson printer B model to verify"),
    ("scanner", "Scanner model to verify"),
    ("cricut", "Cricut Maker 3"),
    ("cameras", "USB cameras to verify"),
)
SAFE = re.compile(r"^[A-Za-z0-9 _.,():/-]{1,96}$")
RFC1918 = tuple(ipaddress.ip_network(value) for value in (
    "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
))


def sanitized(value: str) -> str:
    result = str(value)[:96]
    if not SAFE.fullmatch(result):
        raise ValueError("Unsafe Windows device label omitted.")
    return result


def windows_registry_devices() -> list[dict[str, object]]:
    if os.name != "nt":
        return []
    import winreg

    rows: list[dict[str, object]] = []
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DEVICEMAP\SERIALCOMM") as port:
            index = 0
            while True:
                try:
                    _, name, _ = winreg.EnumValue(port, index)
                except OSError:
                    break
                index += 1
                if re.fullmatch(r"COM[1-9][0-9]{0,3}", str(name)):
                    rows.append({
                        "kind": "serial", "device_id": str(name),
                        "label": "Windows serial interface " + str(name),
                        "presence": "enumerated", "proof": "windows_registry",
                    })
    except OSError:
        pass
    root = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Print\Printers"
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, root) as printers:
            index = 0
            while True:
                try:
                    name = winreg.EnumKey(printers, index)
                except OSError:
                    break
                index += 1
                try:
                    name = sanitized(name)
                except ValueError:
                    continue
                rows.append({
                    "kind": "printer_queue", "device_id": name, "label": name,
                    "presence": "enumerated", "proof": "windows_registry",
                })
    except OSError:
        pass
    return rows


def optional_octoprint() -> dict[str, object] | None:
    key = os.environ.get("ROSEVEAR_WORKSHOP370_OCTOPRINT_KEY")
    if not key:
        return None
    headers = {"X-Api-Key": key, "Accept": "application/json"}
    values: dict[str, object] = {}
    try:
        for endpoint in ("job", "printer"):
            request = Request("http://127.0.0.1:5000/api/" + endpoint, headers=headers)
            with urlopen(request, timeout=3) as response:
                if response.status != 200 or response.headers.get_content_type() != "application/json":
                    return None
                data = response.read(8193)
                if len(data) > 8192:
                    return None
                values[endpoint] = json.loads(data)
        job = values["job"]
        printer = values["printer"]
        if not isinstance(job, dict) or not isinstance(printer, dict):
            return None
        status = printer.get("state")
        printing = (
            isinstance(status, dict) and isinstance(status.get("flags"), dict)
            and status["flags"].get("printing") is True
        )
        row: dict[str, object] = {
            "kind": "octoprint", "device_id": "octoprint-local",
            "label": "Local OctoPrint printer",
            "presence": "reported_printing" if printing else "reported_idle",
            "proof": "octoprint_loopback",
        }
        progress = job.get("progress")
        if isinstance(progress, dict):
            amount = progress.get("completion")
            if isinstance(amount, (int, float)) and 0 <= amount <= 100:
                row["progress_percent"] = round(float(amount), 1)
        temperatures = printer.get("temperature")
        if isinstance(temperatures, dict):
            for key_name, target, maximum in (
                ("tool0", "nozzle_c", 350), ("bed", "bed_c", 180),
            ):
                measure = temperatures.get(key_name)
                if isinstance(measure, dict):
                    actual = measure.get("actual")
                    if isinstance(actual, (int, float)) and 0 <= actual <= maximum:
                        row[target] = round(float(actual), 1)
        return row
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return None


def payload(collector_id: str, now_ms: int) -> dict[str, object]:
    devices = windows_registry_devices()
    devices.extend({
        "kind": "manual_note", "device_id": name, "label": label,
        "presence": "unverified", "proof": "owner_note",
    } for name, label in NOTES)
    optional = optional_octoprint()
    if optional is not None:
        devices.append(optional)
    return {
        "schema": SCHEMA, "collector_id": collector_id,
        "observed_at_ms": now_ms, "expires_at_ms": now_ms + 60000,
        "nonce": secrets.token_hex(16),
        "mode": "READ_ONLY_LOCAL_WINDOWS_OBSERVATION", "commands_sent": 0,
        "physical_devices_verified": False, "devices": devices[:48],
    }


def canonical(value: dict[str, object]) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
    ).encode("ascii")


def sign(value: dict[str, object], private_path: Path) -> dict[str, object]:
    if not private_path.is_absolute() or private_path.is_symlink():
        raise ValueError("Use an absolute private key path.")
    key = serialization.load_pem_private_key(private_path.read_bytes(), password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise ValueError("Ed25519 private key required.")
    return {"payload": value, "signature": key.sign(canonical(value)).hex()}


def create_key(private_path: Path) -> None:
    if not private_path.is_absolute():
        raise ValueError("Use an absolute private key path.")
    private = Ed25519PrivateKey.generate()
    public = private.public_key()
    encoded_private = private.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    encoded_public = public.public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    with private_path.open("xb") as target:
        target.write(encoded_private)
    public_path = private_path.with_suffix(private_path.suffix + ".pub.pem")
    with public_path.open("xb") as target:
        target.write(encoded_public)
    raw = public.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    print("Public key path:", public_path)
    print("Public key SHA256 pin:", hashlib.sha256(raw).hexdigest())
    print("Restrict Windows private-key ACL; never copy the private key to Hub.")


def valid_private_url(value: str) -> str:
    parsed = urlsplit(value)
    try:
        ip = ipaddress.ip_address(parsed.hostname or "")
        private = isinstance(ip, ipaddress.IPv4Address) and any(ip in net for net in RFC1918)
        port_ok = parsed.port == 8443
    except ValueError:
        private, port_ok = False, False
    if (
        parsed.scheme != "https" or not private or not port_ok
        or parsed.path != "/api/v1/workshop-gateway-370/receipt"
        or parsed.query or parsed.fragment or parsed.username or parsed.password
    ):
        raise ValueError("Only exact private HTTPS IPv4 Hub :8443 receipt URL permitted.")
    return value


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise ValueError("Redirect not permitted.")


def push(url: str, envelope: dict[str, object], ca_path: Path) -> None:
    valid_private_url(url)
    if not ca_path.is_absolute() or not ca_path.is_file():
        raise ValueError("Absolute Hub TLS CA PEM file required.")
    context = ssl.create_default_context(cafile=str(ca_path))
    opener = build_opener(HTTPSHandler(context=context), NoRedirect())
    request = Request(
        url, data=json.dumps(envelope, separators=(",", ":")).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with opener.open(request, timeout=8) as result:
        if result.status != 202:
            raise ValueError("Receipt not accepted.")
    print("Signed Windows source observation accepted; machine safety is unverified.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--init-key", type=Path)
    parser.add_argument("--key", type=Path)
    parser.add_argument("--collector-id", default="printer-pc")
    parser.add_argument("--push-url")
    parser.add_argument("--ca-file", type=Path)
    args = parser.parse_args()
    if args.init_key:
        create_key(args.init_key)
        return 0
    if os.name != "nt":
        raise ValueError("Only run this collector on the Windows printer PC.")
    if not args.key:
        raise ValueError("--key is required.")
    if not re.fullmatch(r"[A-Za-z0-9_-]{3,40}", args.collector_id):
        raise ValueError("Invalid collector ID.")
    envelope = sign(payload(args.collector_id, int(time.time() * 1000)), args.key)
    if args.push_url:
        if args.ca_file is None:
            raise ValueError("--ca-file required for authenticated HTTPS delivery.")
        push(args.push_url, envelope, args.ca_file)
    else:
        print(json.dumps(envelope, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError) as error:
        sys.exit("Collector HOLD: " + str(error))
