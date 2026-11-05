# Build 250 — Signed Installed Release Provenance Receipt, Task-Action Custody & Owner-Supervised Recovery Decision

The System screen now imports an **externally issued**, bounded Ed25519 release provenance envelope. The exact canonical UTF-8 signed message is four newline-separated fields (including a final newline): `rosevear-windows-installed-release-250/v1`, release commit SHA-1, artifact SHA-256, observed UTC timestamp. The JSON supplies a 32-byte raw Ed25519 public key (base64) and 64-byte signature (base64). The browser verifies the detached signature with WebCrypto, compares the release commit to the approved main SHA, checks freshness (up to 24 hours) and compares SHA-256 of the public key against a fingerprint independently authenticated out of band. No signing key is created, transmitted or stored by the client.

A mathematical signature match is **not** evidence of signer identity unless the public key was authenticated separately; the receipt alone cannot prove that a particular executable or Windows service uses the artifact or that the release is healthy. There is deliberately no automatic trusted key, no auto-generated signature, no production attestation and no recovery authorization.

The same owner view presents recovery-task drift classification from Build 249 and a local-only decision queue (keep HOLD, inspect, prepare a supervised recovery review). Each choice leaves restart, rollback, task editing and closure disabled. Owner recovery must use the original Windows runbook and verified encrypted backup with separate authorization.

Next proposed Build 251 — Authenticated Signer Enrollment, Immutable Windows Artifact Mapping & Supervised Recovery Receipt Custody.
