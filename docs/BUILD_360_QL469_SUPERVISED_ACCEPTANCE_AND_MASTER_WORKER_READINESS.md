# Rosevear AI Hub Build 360 / QL-469 — Supervised Original-Host Acceptance, Authenticated Guest/Camera Evidence and Separate Master Worker Readiness

## Original-host state carried forward (November 17, 2026)

The latest original DESKTOP-AE894KC owner PowerShell observation reported the two **exact** unattended Hub startup and recovery Task Scheduler identities as installed and verified, **both Disabled**. Home Assistant runs as the original VirtualBox EFI guest; Ollama, Hub local health and Tailscale were healthy in the recorded preflight. No new supervised Windows reboot, independent pre-login receipt, authenticated guest/MQTT/camera recovery proof, or separately installed AI Data Platform / Comms Hub Windows worker service was supplied. The local unrelated untracked package-lock.json remains untouched.

**Never confuse GitHub Actions success on main with original-PC physical 24/7 production.**

## Build 360 source additions

1. scripts/assess-supervised-acceptance360.py is a completely **offline, read-only** four-scope acceptance evaluator. It calls the existing Build 359 signed pre-login verifier and local AfterReboot correlation, and independently verifies scoped field attestations for the authenticated Home Assistant/MQTT/camera recovery drill and each proposed Master worker.
2. Field attestations use an exact JSON schema and a separate detached Ed25519 signature, independent public-key SHA256 pin, time window (at most 24 hours), source commit, original PC hostname, unique nonce, checked evidence digest and scope-specific explicit true checklist. Tampering, expiry, malformed claim, mismatched host, wrong source, missing receipt, incorrect pin and unverified/private Comms receiver status HOLD. No secret keys are generated, held, accepted or published.
3. Tests in server/tests/test_supervised_acceptance360.py use ephemeral in-memory synthetic keys only. They prove signature rejection and fail-closed behavior, **not** original-host functionality.
4. **Source-level truth is deliberately limited:** a verified signature authenticates the reviewer's statement, not the real-world action. Even a complete set of signed assertions does not independently prove physical login-screen state, genuine device authentication or Windows SCM operations. This assessor **always** sets physicalUnattendedProductionGreen=false, threeMasterWorkerProductionGreen=false, commsPrivateTestReceiverAuthorized=false, automaticEnrollmentAuthorized=false and changesMade=false. Final owner/independent review remains mandatory.

## Input custody, after independent supervised field work

There are **no required operational changes** and no field receipts to fabricate in CI. Only after a separate owner-supervised maintenance window, off-host backup verification and rollback readiness, capture genuine outputs outside the Git worktree. In a private evidence directory, the evaluator expects:

| Scope | Files | Required independent signed claim |
|---|---|---|
| Prelogin + local | local-after-reboot.json, prelogin-receipt.json, prelogin.sig.b64, prelogin-probes.jsonl, prelogin.pub.pem | Genuine local Build 358 AfterReboot and Build 359 independently signed off-host claim, exact source SHA and key pin |
| Guest/recovery | guest.json, guest.sig.b64, guest.pub.pem, guest.evidence | Home Assistant authenticated API, MQTT publish/subscribe ACK, camera playback, private HTTPS, independent backup restoration, supervised recovery |
| AI Data Platform | ai-data-worker.json, ai-data-worker.sig.b64, ai-data-worker.pub.pem, ai-data-worker.evidence | Approved original Windows service identity, pinned mTLS, durable signed ACK/replay, owner-reviewed rollback |
| Comms Hub | comms-worker.json, comms-worker.sig.b64, comms-worker.pub.pem, comms-worker.evidence | Separately authorized **non-receiver** worker identity, pinned mTLS, signed ACK/replay and rollback, **private QL-340C TEST receiver OFF** |

All field JSON files use schema rosevear.hub.ql469.field-assertion360.v1 and exact fields: schema, scope, host, sourceCommit, observedAt, issuedAt, nonce, evidenceSha256, signerKeyFingerprint, checks. Scope-specific checklist keys are defined as CHECKS in the assessor. Signatures cover canonical JSON sorted keys and compact separators; encode detached Ed25519 signatures as strict base64. Check hashes against nonsecret, sanitized evidence files. Independent owner trust-pins must come from a source **separate** from the attestation directory. Do not post private keys, passwords, Home Assistant tokens, camera images or credential-bearing logs in GitHub or chat.

Read-only invocation (use actual current 40-hex commit, and individually approved 64-hex independent signer pins):

~~~powershell
python .\scripts\assess-supervised-acceptance360.py --evidence-dir "C:\PRIVATE\hub-review" --expected-commit ACTUAL_40_HEX_MAIN_SHA --prelogin-key-sha256 OWNER_PIN --guest-key-sha256 GUEST_PIN --ai-data-worker-key-sha256 AIDP_PIN --comms-worker-key-sha256 COMMS_PIN
~~~

Run with --strict to return exit code 2 while HOLD remains. Missing files return safe HOLD statuses without changing any task, credential, guest, service, receiver, firewall or branch. The report is not authorization to activate services.

## Independently supervised operations remain HOLD

- On DESKTOP-AE894KC, begin with **read-only** install-hub-unattended356.ps1 -Inspect and inspect-reboot-continuity358.ps1 -Mode Preflight. Disabled tasks correctly report HOLD_TASKS_NOT_ENABLED.
- Only an owner with separately approved backups, authenticated Home Assistant/MQTT/cameras, trusted second-device HTTPS and rollback may enable the two **known** tasks, capture a baseline and supervise one genuine reboot. Never perform reboot or enable tasks solely because GitHub code is GREEN.
- AI Data Platform and Comms Hub Windows service enrollment require their **own** verified installer, custodian authority, service identity and mTLS/ACK evidence. This build provides no installer and starts no service. QL-340C remains OFF.
- Use the existing scripts/audit-remote-branches359.ps1 -Json after fresh git fetch --prune origin to classify individual branch tips, protect dev/main and preserve HOLD_UNMERGED branches. **No bulk deletion:** a branch tip must be an exact ancestor of a freshly verified main and owner must approve release-tip removal. Build 359's fourteen confirmed merged tips are historical candidates requiring recheck, not automatic deletion authorization.
- Existing 16 common visual themes and responsive form changes from Build 359 are preserved without adding new themes or cross-repo deployment dependencies.

## Release acceptance and next build

Protected dev PR must pass every full Foundation/Backend/Web/Desktop job before merge. Promote only these isolated Build 360 source files to a clean main candidate; require its full PR CI and independent protected main push CI. **Code/main GREEN** may then be declared. **Physical PC/three-Master GREEN stays HOLD** until original-host evidence and peer authority actually exist.

**Next proposed Build 361 / QL-470:** Original Windows host recovery history and telemetry review, independent owner-approved Master worker installation/rollback contracts, authenticated guest/device runtime receipts and read-only acceptance dashboard integration. No service auto-enrollment or private receiver activation.
