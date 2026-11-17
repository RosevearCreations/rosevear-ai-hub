# Rosevear AI Hub Build 359 / QL-468 — Signed witness, Master UI themes and safe branch audit

## Source evidence and physical HOLD

On November 17, 2026, the original DESKTOP-AE894KC owner's PowerShell Preflight at protected main dce3849c335f3e5d057f6cbb8de3b7efd6c0659b confirmed both exact password-backed unattended task identities VERIFIED, but both tasks DISABLED; all local VM/Hub/Ollama/Tailscale dependencies were healthy. HOLD_TASKS_NOT_ENABLED is an expected intentional gate. No baseline, reboot or independent pre-login witness was recorded, and no other Master worker Windows SCM service was detected. The untracked local package-lock.json must remain untouched.

## Build 359 signed external witness (read-only)

- scripts/verify-signed-prelogin-witness359.py accepts an independently generated detached Ed25519 signature with a separately owner-pinned public-key SHA256, matching original host, exact source commit, external TLS probe file SHA256 and its nonce, UTC observation/issuance windows and required no-login claim fields. It rejects signature tampering, replays, wrong key, incomplete claims or mismatched witness evidence. It cannot generate, enroll, store or rotate operational signing keys.
- scripts/reconcile-original-host359.py crosschecks the verified external signed claim against the actual local AfterReboot continuity report and matching source commit. It *cannot* assert that a Windows login screen was really observed from a verified device, that HA/MQTT/cameras were authenticated, or that independent worker ACK occurred. Those booleans remain FALSE pending separate, genuine authority and evidence.
- CI test keys exist only in ephemeral test memory; they are not operational trust anchors. An Ed25519 signature proves authenticity of a claim, not independently that the claim is true.
- Never submit actual private keys or credentials to GitHub, chat, dashboards or issue comments. A pre-login reboot witness requires a real supervised original-PC reboot and trusted second computer; no such reboot is performed by this source release.

### Safe original-host preflight

~~~powershell
cd C:\Users\ree\rosevearaihub
git status --short --branch
git pull --ff-only origin main
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Inspect
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-reboot-continuity358.ps1 -Mode Preflight
~~~

Do not run -Install again. If the tasks remain Disabled, HOLD_TASKS_NOT_ENABLED must remain. Do not run -Enable, capture a reboot baseline, restart Windows, or start another Master without separate owner-supervised backup, real HA/MQTT/camera tests, private HTTPS independent client readiness and approved rollback.

### Signature verification AFTER genuine supervised reboot and off-host evidence

A separately authorized external witness operator must sign the fixed acceptance JSON with their already approved, privately held Ed25519 key, after independently observing the login screen and no owner sign-in. An authorized owner must independently pin the public key. Verification ONLY:

~~~powershell
python .\scripts\verify-signed-prelogin-witness359.py --receipt .\signed-claim359.json --signature-base64 .\signed-claim359.sig.txt --witness-jsonl .\witness358.jsonl --trusted-ed25519-public-pem .\owner-approved-witness.pub.pem --trusted-key-sha256 YOUR_INDEPENDENT_PINNED_64_HEX --expected-commit ACTUAL_MAIN_40_HEX_SHA
~~~

Use scripts/reconcile-original-host359.py with the same inputs plus --local-json AFTER obtaining real AfterReboot output. Reports still preserve physicalProductionGreen=false pending genuinely corroborated login-screen state, HA guest/MQTT/camera testing and separately authorized peer services.

## Four additional themes — exact 16-choice catalogue across all three Masters

The existing identical twelve-theme catalogues already had the same GitHub blob SHA in rosevear-ai-hub, ai-data-platform and rosevear-comms-hub. Build 359 adds four display-only choices WITHOUT removing existing themes:

| ID | Name | Palette |
|---|---|---|
| aurora | Aurora Signal | cyan/teal dark |
| amber-night | Amber Night | copper/amber warm dark |
| orchid | Orchid Circuit | lavender/orchid dark |
| daylight | Daylight Control | accessible blue-white light |

All three repos must have identical .github/rosevear-master-themes.v2.json with sharedThemeCount=16 in build359Extension, corresponding real UI theme selector options and CSS tokens. Hub also updates strict ShellTheme, saved owner view validation and unit tests to accept and retain all sixteen without granting authority. Hub, AI Data Platform and Comms each gain responsive input lengths, resizable textareas, 44–46px minimum touch targets, native date/time/month inputs, focus states, word wrapping and light-mode text contrast. No service state, credentials, approvals, or automation are affected. Visual screenshot acceptance remains pending a real browser review at desktop/tablet/mobile widths and zoom; CI alone is not visual review.

## Safe branch removal audit

The observed GitHub remote listing had 206 branch refs including dev and main. Some earlier branches have unmerged commits, so deleting every other branch is NOT safe.

scripts/audit-remote-branches359.ps1 is read-only. It checks each locally fetched origin/ branch tip against origin/main using git merge-base --is-ancestor. It emits:

- SAFE_MERGED: exact branch tip is an ancestor of the reviewed origin/main; eligible for owner-approved deletion after independent verification
- KEEP_PROTECTED: dev and main, never delete
- HOLD_UNMERGED: branch retains unique commits or diverges, keep
- HOLD_UNKNOWN: incomplete or invalid graph, keep

After refreshing local tracking refs (does not delete remote branches), run:

~~~powershell
git fetch --prune origin
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-remote-branches359.ps1 -Json
~~~

Do not use force deletion or bulk automatic removal. A merged PR is not enough if the branch tip acquired new commits. Keep a separate rollback tag before any owner-approved deletion. Goal of only dev/main is reasonable only after current unmerged work is reconciled, promoted or preserved. A local audit of stale refs is not final proof until GitHub remote tips are independently refreshed.


### Independently verified SAFE_MERGED release refs, relative to main at Build 358

GitHub compare confirmed each of these 14 branch TIPS had ahead_by=0 relative to main before Build 359 (not merely closed PRs). They can be proposed for owner-reviewed remote deletion AFTER Build 359 is GREEN and a final recheck proves tips remain unchanged. No deletion performed:

- release/build347-main-isolated
- release/build348-main-isolated-20261116
- release/build349-main-isolated-20261116
- release/build350-main-isolated-20261116
- release/build351-main-isolated-20261116
- release/build352-main-isolated-20261116
- release/build353-main-isolated-20261116
- release/build354-main-isolated-20261117
- release/build355-ql464-isolated-main
- release/build356-ql465-unattended-boot-main
- release/build356-1-resume-existing-pin
- release/build356-2-ql465-correct-trigger
- release/build357-ql466-original-host-reboot-readback
- release/build358-ql467-witness-continuity

Important holds: release/aihub-329-ql438-isolated-main through release/aihub-342-ql451-isolated-main showed one or more unique commits; release/build407-master-theme-main, release/build417-theme-parity-main-clean, and build350–354 active source branches also diverged. Preserve and review those independently. This is a proven PARTIAL safe list, not a complete 206-branch classification. Use the audit script to enumerate every remaining remote-tracking ref after a fresh fetch.

## Master worker enrollment HOLD

- AI Data Platform: no original-PC Windows service observed; needs separate owner/custodian approved real installer, identity, startup mode, pinned mTLS, durable signed ACK and rollback.
- Comms Hub: no original-PC Windows service observed; needs independently approved NON-RECEIVER worker contract, pinned mTLS and durable ACK. QL-340C private TEST receiver remains OFF / unauthorized.
- Hub: disabled tasks are verified; the source does not enable them. Physical reboot continuity, off-host signed witness and guest/camera authenticated testing remain pending.
- Peer issues: https://github.com/RosevearCreations/ai-data-platform/issues/970 and https://github.com/RosevearCreations/rosevear-comms-hub/issues/947. No coordinated seven-app lockstep release and no authority transfer.

Code release production GREEN only after protected main CI success. Original-host 24/7 and three-Master physical GREEN remain HOLD until independently verified original-host evidence.

## Next proposed Build 360 / QL-469

Supervised original-host witness reconciliation, real authenticated guest/camera and recovery drill, separate Master worker service enrollment, and branch cleanup only after all retained unique commits are reconciled.
