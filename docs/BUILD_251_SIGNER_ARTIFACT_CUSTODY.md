# Build 251 — Signer enrollment, immutable artifact mapping and recovery receipt custody

This build adds a **read-only candidate evidence handoff**, not automatic signer enrollment or Windows repair.

1. On the installed Windows machine run `scripts/inspect-hub-artifact-251.ps1`. Save its JSON output as a local file and import it in the Build 251 panel beneath the signed-release review.
2. Import the independently issued Build 250 signed receipt and obtain the signer public-key SHA-256 fingerprint from a separate, authenticated custodian. Verify the detached Ed25519 signature locally.
3. Inspect candidate digest comparison, observation freshness and unresolved findings. The imported inspector explicitly states `signer_authenticated: false` and `release_verified: false`.

**Trust boundary:** Build 250's signed envelope pins an `artifact_sha256` but does **not** specify which artifact it hashes. Build 251 compares it only against the local `apps/web/dist/index.html` digest as a *candidate*. This neither attests the entire bundle nor binds a Windows process, task action, installed release or independently authenticated signing authority. A real immutable mapping requires a signed artifact-kind manifest and independently observed path/process/task evidence.

All enrollment, scheduled-task modification, reboot, rollback and closure flags remain **HOLD**. Evidence is imported and reviewed only in the browser; no Windows state is changed. GitHub production GREEN validates source CI, not installed-machine acceptance. Owner-supervised recovery needs separate authenticated human approval and on-host witnessed evidence before any action.
