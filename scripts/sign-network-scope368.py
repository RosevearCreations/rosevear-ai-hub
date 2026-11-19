"""Sign a one-use Build368 private network approval OFFLINE (no network access).

Provide an existing Ed25519 PRIVATE PEM key, stored away from the Hub.
Copy only the PUBLIC key and its SHA256 raw-key pin to the original Windows host.
Never commit private keys or approval secrets. This does not launch a scan.
"""

import argparse
import hashlib
import json
import secrets
import time
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private-key", type=Path, required=True)
    parser.add_argument("--cidr", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--expected-revision", type=int, default=0)
    parser.add_argument("--ttl-hours", type=int, default=24)
    args = parser.parse_args()
    if not (1 <= args.ttl_hours <= 168):
        parser.error("TTL must be between 1 and 168 hours.")
    # Reuse the production CIDR and label validation; signing stays fully offline.
    from rosevear_ai_hub.api.network_trust368 import LABEL_PATTERN, bounded_private_network
    from rosevear_ai_hub.api.network_trust368 import scope_message

    bounded_private_network(args.cidr)
    if not LABEL_PATTERN.fullmatch(args.label):
        parser.error("Invalid non-secret scope label.")
    if args.expected_revision < 0:
        parser.error("Expected revision must be nonnegative.")
    private = serialization.load_pem_private_key(args.private_key.read_bytes(), password=None)
    if not isinstance(private, Ed25519PrivateKey):
        parser.error("Ed25519 private key required.")
    expiry_ms = int(time.time() * 1000) + args.ttl_hours * 3600000
    nonce = secrets.token_hex(16)
    signed = scope_message(
        args.cidr, args.label, expiry_ms, nonce, args.expected_revision
    )
    public = private.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )
    print(json.dumps({
        "cidr": args.cidr, "label": args.label, "expiry_ms": expiry_ms,
        "nonce": nonce, "signature": private.sign(signed).hex(),
        "expected_revision": args.expected_revision,
    }, indent=2))
    print("Public-key SHA256 pin (separate custody):", hashlib.sha256(public).hexdigest())


if __name__ == "__main__":
    main()
