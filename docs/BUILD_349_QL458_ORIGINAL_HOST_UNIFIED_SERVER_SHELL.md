# Build 349 / QL-458 — original-host owner enrollment and unified Server Shell foundation

## Released on the Rosevear AI Hub source only

- Pinned Ed25519 **owner-signed local manifest** verification, never browser-supplied: exact host `DESKTOP-AE894KC`, fixed three-Master order, valid signed expiry, strict read-only capability allowlists and independent TLS leaf pins. No unsigned/expired/wrong-host/forged manifest is admitted.
- Owner-only, no-store `GET /api/v1/system/server-shell-349`. The API does not expose private keys, certificates, manifest files, or a mutation endpoint. It performs **no network probing**.
- Protected `review_durable_ack349` verifies the QL-457 recipient signature against the separately enrolled registry and confirms the exact original envelope and ACK digests are in the one-time SQLite receipt journal. A matching *pilot* receipt is **not** proof of current production CONNECTED.
- Read-only first **unified Server Shell instrument panel** with three clearly separate Master modules, selectable visual themes, and YW/iCamp Slave Shell monitoring slots. It shows unavailable latency, queue, reliability and live ACK metrics as **unknown**, not invented.
- `ai-data-platform` is the **intended top-level Server Shell/control plane**; `rosevear-ai-hub` remains the local Windows automation runtime; `rosevear-comms-hub` remains the communications module. This release does **not** merge repositories, install remote software or run their processes.
- Master module `desiredEnabled` values are signed **configuration intent**, NOT service start/stop control. Actual kill switches, dispatch gating, watchdogs and durable scheduling on the original Windows host require future supervisor adoption/verification. UI theme selections are presentation-only and cannot activate a service.
- Protocol **1.1** preferred; **1.0** retains adjacent read-only compatibility. YW and iCamp Vercel deployments remain untouched. Devil n Dove and Rosie Dazzlers can be enrolled independently later.
- Owner review must obtain independent actual original-host evidence, certificate custody, TLS handshake, signed ACK, persisted receipt and separate application witness before marking a specific link CONNECTED. Receiver state remains UNKNOWN, incident remains OPEN, physical activation remains DENIED.

## Safe original-host installation (not performed by this GitHub release)

Provision outside Git using Windows owner-only ACLs: an Ed25519 public-key raw 32-byte file, a manifest signed by its corresponding **separately protected** owner key, an independently pinned SHA-256 digest of that public-key file, and the original-host-only paths. Configure `ROSEVEAR_QL458_MANIFEST_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PIN` for the local Hub service. The manifest JSON has `payload` and `signature` (hex Ed25519 of canonical JSON); never commit keys or manifest secrets. Missing or invalid configuration returns HOLD. No remote self-enrollment.

## Next proposed Build 350 / QL-459

Three-Master Server Shell supervisor with genuine per-module Windows service lifecycle gates, separate owner-approved scheduling controls, protected restart/recovery automation and independent live read-only iCamp/YW telemetry, while maintaining strict tenant isolation and rollback. Source CODE GREEN is not deployed-host GREEN.
