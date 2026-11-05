# QL-338 Windows Hub source implementation and owner-only field handoff

Source software exports a **disabled-by-default** relay protocol and encrypted offline metadata snapshot utility; no service, listener, Tailscale route, Windows task, scheduled retry, device control or private key is installed by this build. Shared contract: `docs/integration/ql338-hub-relay-contract.v1.json` (byte-identical to Comms).

The device owner can inspect the local installation with the source file `scripts/inspect-ql338-hub-readiness.ps1`, run from PowerShell in the checked-out Rosevear AI Hub folder. This reads scheduled task status, whether Tailscale is available, and whether backend port 8765 binds only to loopback. It **does not prove** certificate identity, access policy, key custody, a genuine signed handshake, or successful recovery. Do not publish IPs, names, ACLs, secret keys or full device logs.

Before installing any relay, owner-supervised approval is still required for: source identity and independently held signing key; separate witness; master and source-owner TEST grant; Windows least-privilege service identity; private TLS origin and tailnet ACL; restricted encrypted queue storage ACL; kill switch, credential revocation and rollback; physical reboot/offline witness. The existing Hub server remains local-only and protected; no router or public listener changes are authorized.

`scripts/ql338-private-relay.mjs` exports pure preflight, request verifier, heartbeat schema, AES-GCM snapshot and bounded retry calculations. It has **no network or filesystem writes**. The owner must approve and install a future persist/sender adapter with protected credentials before it can relay anything. Even a synthetic positive test returns no connection or runtime activation.

Testing: `node scripts/ql338-private-relay.test.mjs`. Negative cases cover camera/vault route, POST, wrong device, missing approval, replay nonce, redirect, expired request, invalid signature, queue tampering, wrong key, expired receipt and open circuit. GitHub source CI proves only code readiness, not installed Windows version, physical uptime or owner permission.

Comms Hub control-plane database currently reports six public-manifest discovery links, **0/6 genuine signed private connections**. AI Data Platform's QL-266 deferred status is correct until original signed read-only source receipts and separately authorized TEST grants exist.
