# Rosevear AI Hub Build 358 / QL-467 — Verified identity, independent boot witness & guarded Master enrollment

## Current original-host evidence (owner PowerShell, November 17, 2026)

Original PC: DESKTOP-AE894KC; protected main Build 357 commit 6eead4f6fb93ed21c9bcae4093e0533bb69475b9 was fast-forwarded successfully. Existing unrelated untracked \`package-lock.json\` is preserved and must not be deleted/reset.

- **Boot task:** Installed DISABLED; *all 11 exact identity fields verified*, no mismatches.
- **Recovery task:** Installed DISABLED; *all 11 exact identity fields verified*, no mismatches; five-minute indefinite TimeTrigger and same password-backed original owner SID verified.
- Original VirtualBox Home Assistant VM UUID/EFI and Ollama executable pin verified, guest running. Hub loopback HTTP health, Ollama loopback health, Tailscale Auto+Running verified.
- **NOT OBSERVED**: task run since new Windows boot, real pre-login startup, reboot recovery, original HA/MQTT/camera authenticated continuity, owner backup acceptance, off-machine TLS witness.
- **NOT ENROLLED / NOT VERIFIED**: actual approved AI Data Platform and Comms Hub Windows worker services on original PC (both Windows SCM serviceDetected=false). Independent owner/custodian approval, mTLS live peer, durable signed ACK and private Comms receiver authority remain unverified.
- No reboot has yet been reported. **Do not pretend GitHub source CI is original-PC boot acceptance.**

## Build 358 deliverables

1. \`scripts/inspect-reboot-continuity358.ps1\` is **read-only by default**. Modes: \`-Mode Preflight\`, \`-Mode CaptureBaseline\`, and \`-Mode AfterReboot\`. It obtains fresh Build 357 identity/health evidence. The only write is one nonsecret baseline with *CreateNew* under the original Windows owner's private profile; it refuses to replace an existing baseline. It requires BOTH exact tasks enabled and all local prerequisites healthy for baseline capture.
2. After a **real owner-supervised reboot**, it requires a different Windows boot time from its baseline, source commit unchanged, both tasks run successfully since that boot, still-verified exact task identities, and healthy Hub/VM/Ollama/Tailscale. A local continuity result alone **never sets physicalProductionGreen true**.
3. \`scripts/witness-hub-prelogin358.py\` is run on a **different, already trusted LAN/Tailscale computer**. It repeatedly probes a supplied HTTPS health URL with normal TLS hostname/CA verification (no insecure \`-k\` mode, no HTTP, no redirects or embedded credentials). It records UTC, successful/failed probes and a hash-chained JSONL file without logging the URL, camera frames, secrets, credentials, response bodies or private keys. The \`verify\` mode checks accidental edits.
4. That external witness file is **NOT digitally signed or an independent owner authorization**. A hash chain can be recreated by an adversary; HTTPS reachability alone cannot prove the original Windows sign-in screen remained untouched. Independently witnessed pre-login proof requires the owner to supervise original PC logon state and an independently signed, time-bound external receipt. The source reports these outstanding attestations as FALSE rather than inventing them.
5. AI Data Platform and Comms enrollment remains a separate owner/custodian procedure. No Windows worker or Comms private TEST receiver is installed/started by this build. Any future mTLS and ACK must be verified from each independently approved original-host worker, not a cloud release or a simulated fixture.

## Safe next original-host workflow

The two existing tasks are installed, so **DO NOT re-run \`-Install\`**, re-pin the VM, reset Task Scheduler, change credentials, reboot without independent trusted client and backups, or delete untracked files.

### A. Read-only preflight

~~~powershell
cd C:\Users\ree\rosevearaihub
git status --short --branch
git pull --ff-only origin main
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Inspect
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-reboot-continuity358.ps1 -Mode Preflight
~~~

When still disabled (as previously observed), \`HOLD_TASKS_NOT_ENABLED\` is EXPECTED. This is a safe HOLD, not a regression. Confirm separately a restorable off-host Hub backup, a separate original VirtualBox/HA backup, authenticated MQTT, camera playback and HTTPS from a trusted client. The read-only snapshot cannot verify any of those by itself.

### B. Independent owner-controlled supervised acceptance (do NOT run until approved)

- Same elevated original Windows user, after verifying backup and original-guest dependencies, may use the existing strict, exact-identity-guarded \`install-hub-unattended356.ps1 -Enable\`. It enables only the two known Hub tasks and does not restart Windows or enroll any other Master.
- Verify task \`-Inspect\` reports both Enabled/Ready and the identities still exact. Perform a supervised **one-time task run under stored-credential principal** via Task Scheduler, then independently inspect LastRunResult plus real Hub HTTP/PWA, original HA MQTT, HTTPS gateway and cameras. Neither LastRunResult zero nor a process listening is by itself pre-login proof.
- Run \`inspect-reboot-continuity358.ps1 -Mode CaptureBaseline\` **once** after enabled and healthy; this only writes a no-secret local baseline. A repeated baseline creation HOLDS rather than overwrites. Preserve its file until the next acceptance attempt is reviewed.
- On a separate trusted computer, start the external witness monitor with a **trusted HTTPS URL** whose server certificate matches hostname or whose custom CA is verified. The provided endpoint must be a genuine private-LAN/Tailscale-reachable \`/health\` path, not \`localhost\` or a credential-bearing URL.

~~~powershell
# On a DIFFERENT trusted Windows computer, with Python 3 available:
python .\scripts\witness-hub-prelogin358.py probe --url "https://YOUR-TRUSTED-HUB-NAME:8443/health" --output ".\witness358.jsonl" --samples 240 --interval 5

# Optional private-CA certificate:
# add --cafile "C:\path\to\trusted-ca.pem"
~~~

- With backup/VM fallback ready, supervise a REAL Windows reboot at DESKTOP-AE894KC and DO NOT sign into its desktop until the independent HTTPS/HA availability has been witnessed from the other computer. Never remotely reboot, change task credentials, start the other Master services, bypass TLS, or claim the remote witness was digitally signed.
- Then, **after the reboot and owner sign-in**, run:

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-reboot-continuity358.ps1 -Mode AfterReboot
~~~

On the external computer, check its file integrity:

~~~powershell
python .\scripts\witness-hub-prelogin358.py verify --input ".\witness358.jsonl"
~~~

A local \`localContinuityObserved=true\` and an independent probe recovery are **two distinct pieces of evidence**. Neither alone proves unattended boot before sign-in. Owner-witnessed login-screen state, authenticated HA/MQTT/cameras, signed independent receipt, and independently enrolled peer ACK are additional gates.

### C. Rollback

The original interactive tasks remain as a fallback. The existing installer \`-Disable\` works only for known verified Hub tasks and does not shut down running original services. A failed boot acceptance must be recorded as HOLD; preserve the baseline, logs, private credentials, existing VirtualBox VM, and accepted fallback. Do not force a service reinstallation or reactivate obsolete \`Rosevear AI Server Startup\`.

## Three-Master authority matrix

| Component | Known original-host state | What is still needed |
|---|---|---|
| Rosevear AI Hub | Both new startup/recovery tasks installed, Disabled, exact identity verified | Supervised enable; real no-sign-in reboot, repeatable task recovery, authentic guest/device/camera and signed off-host witness |
| AI Data Platform | \`Rosevear-AIDataPlatform\` Windows SCM service not detected in source host report | Actual owner-approved worker installer, operator/custodian-signed enrollment, pinned mTLS cert/identity, persistent queue, independent signed ACK and rollback |
| Rosevear Comms Hub | \`Rosevear-CommsHub\` Windows SCM service not detected in source host report | Determine independently if non-receiver worker is actually intended; signed source/sink ACK and cert custody, preserve QL-340C private TEST receiver OFF |

Cross-product handoffs: https://github.com/RosevearCreations/ai-data-platform/issues/970 and https://github.com/RosevearCreations/rosevear-comms-hub/issues/947 . Do not treat Github/Vercel GREEN as original-host worker installation or cross-module lockstep release.

**Production declaration:** GitHub source/CI GREEN ONLY after protected main push workflow completes. Physical original-host 24/7 / three-Master operation remains HOLD until independent live receipts are supplied.

## Next proposed Build 359 / QL-468

Supervised original-host reboot evidence reconciliation, independently signed external probe acceptance, HA/MQTT/camera continuity, and separately approved AI Data/Comms Windows worker enrollment with actual signed mTLS and ACK.
