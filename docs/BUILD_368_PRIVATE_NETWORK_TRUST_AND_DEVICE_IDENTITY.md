# Build 368 — Private network trust foundation and safe device identity

**Date:** 2026-11-19. **Stage:** source implementation. Original-host field acceptance is separate.

## Delivered source
- New owner-only Devices panel for private network segment approvals, identity review and IP/lease history.
- Exact RFC1918 IPv4 scope limited to /24–/32. Each approval requires an independently pinned Ed25519 public key and detached signature of CIDR, label, expiry, revision and one-use nonce.
- Append-only owner-entered observations with exact source IDs, private IPs, lease hints, collision warnings, stale approvals, optimistic decision revisions and audit events.
- Manual-review-only: no background scan, DNS, ARP, ping, router change, Home Assistant adoption, MQTT publish, camera pairing or hardware control.
- Migration 0030 retains existing data and adds scoped trust/identity/history tables.

## Independent owner key custody and first use
1. Back up original Windows Hub database, verify current deployment SHA and Alembic revision 0029 before running the standard approved migration.
2. Generate an Ed25519 key pair on a separately trusted offline signing system. For example, run the OpenSSL genpkey ED25519 operation and then export its PUBLIC PEM. Keep the private key OFF the Hub and GitHub.
3. Copy only the PUBLIC PEM to a protected absolute path on DESKTOP-AE894KC. Set process environment ROSEVEAR_NETWORK368_OWNER_PUBLIC_KEY_PATH and ROSEVEAR_NETWORK368_OWNER_PUBLIC_KEY_PIN, the SHA256 digest of the 32-byte raw Ed25519 public key, verified out of band.
4. On the offline signer with Python app dependencies installed run:
   python scripts/sign-network-scope368.py --private-key PRIVATE_KEY_FILE --cidr 192.168.1.0/24 --label "Home LAN" --expected-revision 0 --ttl-hours 24
   Replace example subnet with the genuinely approved one. Never copy PRIVATE_KEY_FILE to the Hub. The helper prints a bounded signed JSON receipt and public key pin, with no network access.
5. Sign in to the Hub as owner, open Devices → Private network trust & device identity and paste the JSON receipt. Submit only when the CIDR and duration were explicitly reviewed. Manually register source IDs and privately observed IPv4 addresses. This is not an automatic device import.
6. Field witness must separately confirm local role denial, signature tamper and replay denial, real IP lease provenance, collision handling and absence of new network scanning before calling any real device verified.

## Scope, acceptance and rollback
- Source CI must pass backend tests, full web typecheck/tests/build, desktop/Windows checks and independent main-push verification.
- This source release does not prove hardware presence, router health, private key provisioning, multi-Master receiver authorization, automatic device discovery or a successful original-Windows installed release.
- Roll back code without destroying the audit/history SQLite tables or changing existing Windows scheduled tasks and local Home Assistant services. Revoke a signing key with an independently authorized owner change.
- Source progress provisional security 55→60 and network discovery 20→28 only. Updated 24-module coverage in docs/contracts/hub-feature-progress368.json; field acceptance unchanged.
- Next planned Build 369 — Whole-home Home Assistant inventory reconciliation. 19 future builds remain, 369–387.

## Verifiable references
- docs/BUILD_QUEUE_368_387_HOME_NETWORK_MASTERS.md
- docs/contracts/hub-feature-progress367.json
- server/src/rosevear_ai_hub/api/network_trust368.py
- server/tests/test_network_trust368.py
- scripts/sign-network-scope368.py
