# Build 123 — Independent household vault provider decision packet

## Decision required, not made

Builds 119–122 are intentionally non-operational security architecture, verification and Windows acceptance planning. Build 123 creates an owner-facing **decision packet** to compare a mature independent keeper against our actual needs. It does **not** select or install a provider, enable credential input, register a passkey, generate recovery codes, start a service or open any vault endpoint. The Hub must never decrypt or proxy the future vault. `assessVaultProviderDecision()` unconditionally reports `HOLD` and no installation authorization, even if all review fields are forged.

## Candidate approaches to investigate

| Approach | Questions to resolve with current primary sources | Not an approval |
| --- | --- | --- |
| Official vendor-supported self-hosted keeper (e.g., Bitwarden) | Actual licensed household sharing, officially supported clients, hosting resources, update plan, passkey/2FA and encrypted backup features | No version, license or server suitability assumed |
| Offline encrypted file manager (e.g., KeePassXC) | Family sharing boundaries, sync conflict prevention, Windows/phone client support, backup and recovery, and whether separate MFA meets our requirements | Offline encryption alone is not proof of convenient secure multiuser access |
| Other maintained and independently reviewed keeper | Cryptographic design, audit history, official update and disclosure process, privacy/account controls, import/export, incident response | Do not roll our own cryptography or select an unreviewed fork |

Confirm official vendor terms at decision time. Avoid trusting outdated third-party comparison pages or assuming a free self-hosting option includes all multiuser capabilities. Do not commit any production configuration or credentials into the repository.

## Eight owner questions and required evidence

1. **License and household sharing:** list planned household users/devices and explicit shared-collection requirements; verify the current edition and cost from official terms.
2. **Maintenance and official updates:** review supported Windows/server environment, signing/source, update cadence, advisory feed and staged rollback.
3. **Client cryptography:** review provider encryption/key design and the hard boundary keeping master keys and plaintext out of Hub, server logs, Knowledge, Chat and AI tools.
4. **Individual identity:** use disposable accounts to confirm personal vaults are private from Hub admins and only intentionally shared collections are visible.
5. **Strong MFA:** verify primary and backup phishing-resistant authenticators, genuine step-up, revoke/lock flows and secure recovery in the selected edition.
6. **Private network:** plan a dedicated trusted HTTPS origin, firewall-scoped LAN and restricted Tailscale, without router forwarding, unsafe cookie reuse or iframe embedding.
7. **Encrypted offline recovery:** prove export/backup support, independent offline key custody, isolated restore drill and loss-of-key procedures.
8. **Safe adoption:** define a disposable-account pilot, revert path and owner acceptance on our actual Windows computer before migrating any household passwords.

## Decision handoff and release boundary

The owner must separately state (a) the exact chosen provider and edition, (b) whether any paid licensing is acceptable, (c) chosen Windows hosting/isolation arrangement, (d) private HTTPS origin approach and (e) approval for a **test-only** installation. Security review must confirm the vendor's capabilities before granting test installation. A subsequent release should install only an isolated disposable-account trial; normal password storage remains disabled until independent Build 122 field checks are truly completed.

If approval is absent, remain on `PASSWORD_VAULT_HOLD`, continue using an existing trusted manager and do not present a sign-in or password field in Hub. GitHub source CI GREEN is not approval to store live secrets.

## Automated checks

`vaultProviderDecision.test.ts` verifies eight distinct criteria, no auto-selection, rejection of forged completed reviews, continued denial when reviews fail, and the absence of any activation side effect. `VaultArchitectureView.test.tsx` verifies the explicit owner-decision warning and a page with no credential field, submit form, button or fetch side effect.
