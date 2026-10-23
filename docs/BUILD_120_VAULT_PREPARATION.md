# Build 120 — Vault isolation and lock security preparation

## Owner-selected delivery boundary

Build 120 is **preparation only**. No password-manager software is installed, no vault encryption or storage is implemented, and there is no secret-entry surface, sync, autofill, unlocking, master-key handling, new backend route, database migration, Windows service, deployment script or credential export. The existing architecture and new readiness assessment both unconditionally report **HOLD**, even if review flags are forged. GitHub source CI GREEN is not a live-vault security clearance.

## Six pre-install reviews

1. **Provider:** owner evaluates a maintained independent keeper, terms/licensing for household members and sharing, vendor updates, resource profile, and supported clients. No unreviewed custom cryptography.
2. **Isolation:** independent least-privilege runtime identity, filesystem permissions, encrypted provider database, per-person authorization, backup destination and excluded Hub/Knowledge/AI integrations. No shared encryption key with Hub Secrets.
3. **Private transport:** owner verifies exact trusted HTTPS origin, certificate, Caddy routing, limited LAN/Tailscale access, no router port forwards or cookie sharing. Hub must not iframe or proxy decrypted content.
4. **Client locking:** verify independent authentication/unlock, provider-supported idle lock, sign-out behavior, lost-device revocation, clipboard/autofill handling and separate household sessions. Hub sign-in never unlocks the keeper.
5. **Leak prevention:** inspect log redaction, browser storage/cache and service-worker scope, telemetry, backups, Knowledge ingestion, AI tools and clipboard against accidental master-password, decrypted value, key or TOTP-seed capture.
6. **Recovery:** owner-held offline recovery material separate from encrypted backups, tested restore to an isolated staging instance, retention and loss-of-key procedure. No real entries until recovery and MFA are verified.

## Future go/no-go

Require explicit written provider/hosting approval, security review of version-pinned official distribution, private HTTPS configuration, isolated backup/restore rehearsal, independent MFA (Build 121), negative tests and owner-supervised installed-Windows acceptance (Build 122). If any check fails, continue using the current external password manager. Never submit actual credentials, recovery codes or private configuration in GitHub issues, PRs, ChatGPT or diagnostics.

## Test boundary

`vaultPreparation.test.ts` verifies six distinct pre-install reviews and immutable fail-closed runtime status, including forged completion flags. `VaultArchitectureView.test.tsx` checks visible preparation warnings and absence of form, input, button and fetch side effects. The new code does not communicate with any vault service.
