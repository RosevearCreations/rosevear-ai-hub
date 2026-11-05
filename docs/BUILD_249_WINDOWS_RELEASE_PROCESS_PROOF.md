# Build 249 — Windows Release-to-Process Proof, Recovery Drift & Post-Reboot Acceptance

Run `powershell.exe -NoProfile -File .\scripts\inspect-hub-process-249.ps1` in the **installed Windows Hub checkout** (optional `-WebPort` and `-BackendPort`). It reads loopback listener owners, their executable path membership under that checkout, process start timestamps relative to Windows boot, and recovery scheduled task action classification against the repository's recovery script. The JSON deliberately contains no raw paths, arguments, principals, machine names or credentials.

Import the generated JSON into System → Build 249. The UI strictly validates and whitelists the readback; it records a temporary owner post-reboot visual observation. Missing/stale evidence, an unknown process, executable outside checkout, preboot process, or drifted/disabled recovery task remains flagged for supervised follow-up.

**This is a path and reboot correlation review, not cryptographic attestation.** Even all-green classifications cannot prove the process is running the precise approved commit, that the backend migrated, or that cameras/devices work. The status intentionally remains `OWNER_POST_REBOOT_ACCEPTANCE_HOLD` until independent signed release evidence and owner acceptance exist. No automatic process termination, task rewriting, rollback, upgrade or closure is performed.

Next proposed Build 250 — Signed Installed Release Provenance Receipt, Task-Action Custody & Owner-Supervised Recovery Decision.
