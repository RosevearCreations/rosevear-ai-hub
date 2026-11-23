# Build 382 — Zero-Trust Security, Secrets and Independent Restore

**GitHub-source target: `dev/main` GREEN only after all protected checks. Original Windows security, restored host and independent off-device acceptance: FIELD HOLD.**

## Already implemented, reused rather than replaced

- Existing authentication (Build 016): Argon2 password hashing, hashed opaque session tokens, cookie settings, server-side RBAC, per-user password-change session revocation, guaranteed last owner. Build 225 already exposes a passive owner/admin role/network posture readback.
- Existing secrets (Build 020/032): AES-GCM encrypted storage with a separately held master key, temporary previous key during reviewed rotation, no full saved-secret readback.
- Existing recovery (Build 047/050/224): encrypted authenticated backup archives, manifest hash verification, online SQLite snapshot, isolated non-destructive full archive restore and synthetic drill, local backup metadata. Vault credential intake remains **SECURITY HOLD** under Build 119.
- Existing original-host Windows startup/boot diagnostics (Build 356/357/381) remain unchanged; no background task or automatic action is installed.

## Added meaningful functionality

1. **Owner-only session containment**, `GET /api/v1/system/security-custody-382/posture` and `POST /revoke-other-sessions`: server-side fresh Argon2 verification of the current owner's password plus exact `REVOKE_MY_OTHER_SESSIONS` typed consent; revokes active other sessions for the same exact owner account in one database transaction and records a sanitized audit event. It preserves the requesting session, all other accounts and all other owner's sessions. No credential value or token is logged or returned. A wrong password, household/read-only/unauthenticated user or malformed confirmation fails closed. It is **never invoked during deployment**, only by an owner pressing its explicit UI button. Other-user incident containment is already available via existing supervised owner account/password actions.
2. Owner-only **Security Custody** workspace with clear active-other-session count, maximum configured session lifetime, configured secure-cookie indicator, hold statuses for MFA, TLS, keys, off-machine recovery, and 180-day proposed backup/audit retention. It does not read raw credentials or try to configure Caddy, networking, Windows or hardware. The existing global search and navigation show it only to the owner account.
3. **Real encrypted-copy restore custody**: `python -m rosevear_ai_hub.restore_custody382 verify-copy` compares SHA-256 and exact size of the source `.hubbackup` and a physically distinct file in another directory, then runs the **existing Build 050 authenticated decryption and SQLite-integrity restore drill on the COPY** in a pre-existing scratch directory. The temporary recovered plaintext is discarded; neither archive nor live database is changed. The copy/source hashes are rechecked afterward. Unsafe links, identical files, tampering, missing protected passphrase, inaccessible scratch and existing evidence-file destinations are rejected. **Successful evidence** can be exclusively created as a new metadata-only JSON record, containing archive SHA-256, integrity, file/byte counts, freshness and explicit independent-witness **false** flags; bad/failed checks do not publish success.
4. **Local declared-dependency inventory**: `python -m rosevear_ai_hub.restore_custody382 dependency-manifest --repo-root .` emits deterministic Python runtime/dev and web/desktop declared dependencies and SHA-256 hashes of the source manifest files. It performs **no network installation or CVE scan** and never presents a source manifest as a fully resolved/transitive SBOM or vulnerability clearance. See `pyproject.toml`, `apps/web/package.json`, and `apps/desktop/package.json`.
5. **Retention review only**: 180-day backup and audit targets, a seven-day copy-freshness classification, **no automatic deletion or expiry**, and no misleading claim that duplicate files certify physically separate machines.
6. **Key/TLS/MFA boundary**: present supervised key rotation as an owner workflow, not an automatic process. Existing `SECRET_ENCRYPTION_PREVIOUS_KEY` rewrap must be verified with real rollback; original Caddy private CA, cert trust, browser/camera/Tailscale interoperability and revocation require independent operator tests. The password-vault architecture is not activated and **MFA remains not implemented**, not silently considered secure.

## Original Windows owner acceptance — not performed by GitHub CI

1. Use a clean confirmed `main` checkout on **DESKTOP-AE894KC**, with no unreviewed source reset and the existing schema current through Build 379 migration `0040`. Confirm independent restorable backups and protected recovery secret storage before any account/key change.
2. In **Security Custody**, inspect only sanitized counts. With a separate authorized test login in another browser, explicitly enter the owner's correct password and the exact confirmation, invoke `Revoke my other sessions`, and confirm the other owner browser loses access, the current owner stays signed in, and household accounts remain unchanged. Verify sanitized `auth.session.contained382` in Audit. Never use a live unverified shared account or post credentials into chat.
3. On a trusted offline computer with sufficient encrypted scratch capacity, store a verified backup copy in a **separate, genuinely independent storage location**. The operator chooses actual protected private paths. Perform only after checking malware/security and encryption-at-rest trust.
4. From the approved virtual environment run (replace placeholders locally with real private paths; never paste those into GitHub, chat, screenshots or the UI):

   ```powershell
   .\.venv\Scripts\python.exe -m rosevear_ai_hub.restore_custody382 verify-copy --source-archive "<original.hubbackup>" --copy-archive "<verified-copy.hubbackup>" --passphrase-file "<protected-secret-file>" --work-dir "<existing-scratch-dir>" --evidence "<new-private-evidence.json>"
   ```

   Check `sqliteIntegrity: ok`, archive digest equality, no live overwrite and scratch cleanup. Distinct filenames or directories **do not** demonstrate a different physical machine. Independently witness a restore of the copy on a separately approved computer and verify boot, application login/roles, HA VM, MQTT, local camera, keys and Caddy/TLS before claiming independent physical recovery.
5. Generate the source declaration inventory: `\.\.venv\Scripts\python.exe -m rosevear_ai_hub.restore_custody382 dependency-manifest --repo-root .` (or use `python` in the active venv). Review the **resolved** dependency tree separately, signed upstream packages, current advisories, licenses and Windows executable origin. **No automated CVE clearance was performed**.
6. Perform supervised secret/master-key rotation ONLY through existing documented Build 020 and approved Windows procedures. Test decryptability and rollback before removing the previous key. Independently test actual HTTPS certificates, TLS hostname, trust chain, Tailscale and Windows Firewall without opening public ports.
7. MFA remains HOLD until a reviewed, real authentication enrollment/recovery design and independent original-PC trials exist. Likewise, secure-cookie settings and the PIN/credential escrow are deployment-specific; a source boolean cannot prove live deployment security. Audit role denial must be witnessed from genuine household/read-only accounts.

## Security, scope and rollback invariants

- No task installs, service restarts, router/firewall changes, backup deletion/retention job, certificate or key rotation, MFA credential storage, vault activation, software downloads or actual device actions.
- RBAC is owner-only on BOTH backend endpoints and on the workspace navigation; unauthorized callers get 401/403. Any manual session-revocation action requires password plus exact user-triggered confirmation; there is no scheduled or model-driven route.
- Only the POST action mutates **other same-owner session revoke timestamps** and an audit record. There are **no new tables/migrations**, no arbitrary path/file from an HTTP API, no uploaded private copy or passphrase. The physical restore copy verifier is a separate **local CLI**.
- Source rollback removes new owner workspace/API/CLI and tests but does not automatically un-revoke a session; revoked users can authenticate again with their normal credentials if authorized. It leaves archive data untouched.
- Physical/original-host security GREEN remains HOLD until actual key/TLS review and an independently witnessed off-machine restore and original-host account denial/recovery ceremony are complete.

## Protected source acceptance

Full backend tests, web/typecheck/regressions, desktop-Windows (including existing Windows read-only checks), backup-Windows, documentation and CI-budget must all pass **at the exact candidate heads on separate `dev` and `main` branches**. Unit tests include negative role/session cases, wrong password, replay/idempotence, other-account continuity, sanitized audit, encrypted archive copy tampering, scratch cleanup, explicit independent-witness false and source-only dependency inventories. No post-merge installed-host claims are inferred from source-green.

**Next proposed Build 383 — Three-Master Actual Signed Peer Delivery.** Five numbered builds remain (383–387), plus separately deferred radio/MQTT provenance.

References: [Python sqlite3 backups](https://docs.python.org/3/library/sqlite3.html#sqlite3.Connection.backup), [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html); existing `docs/SECURITY_MODEL.md`, `docs/BUILD_050_DISASTER_RECOVERY_DRILL.md`, `docs/BUILD_119_LOCAL_VAULT_SECURITY_ARCHITECTURE.md`.
