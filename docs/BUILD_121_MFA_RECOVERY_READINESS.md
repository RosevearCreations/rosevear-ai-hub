# Build 121 — Hardware key, passkey and recovery readiness

## Delivery boundary

The owner has not approved a password-manager provider, license, isolated service or private vault origin. Build 121 therefore delivers **policy/readiness only**, consistent with Build 120's preparation-only boundary. It does **not** implement actual WebAuthn registration, passkey issuance, login challenges, MFA enforcement, device revocation, recovery codes or a vault. No secrets, recovery materials or authenticators are entered into the Hub; no network calls, browser storage, routes, migrations or Windows services are added. `assessVaultMfaReadiness()` unconditionally returns `DENY` / `HOLD`, even with falsified review flags.

## Installation prerequisites and security review

1. Approve the exact supported, maintained password manager, edition/license, update policy, supported authenticator methods and household-sharing terms. Confirm an independent provider authentication flow, not a custom Hub identity shortcut.
2. Pin a verified dedicated HTTPS origin and certificate, validate FIDO2 relying-party ID/origin scope and private LAN/restricted Tailscale access. No public router forward, HTTP downgrade, Hub iframe or cookie forwarding.
3. Enroll separate individual household accounts directly with the provider. Confirm a Hub owner/admin cannot view personal entries or bypass another account's factor.
4. Test an actual phishing-resistant primary security key/passkey and user-verification behavior using a staging account. Verify invalid, replayed, expired, wrong-origin and missing challenges fail closed. Never simulate these as success in the Hub.
5. Provision and test a backup independent authenticator before locking in the primary factor; record only that validation occurred, never the private authenticator material.
6. Prove provider reauthentication/step-up for sensitive changes, vault idle lock, logout, stolen-client/device revocation and denial of stale sessions. If provider capabilities differ, revise plan and obtain explicit acceptance.
7. Prepare a carefully controlled offline emergency recovery procedure with owner identity verification and recovery material held separately from the server and encrypted backups. Confirm a lost device does not become a backdoor into another person's private vault.
8. Have an independent tester check MFA downgrade, Hub admin escalation, secret logging, XSS, origin confusion and bypass attempts. Failed or missing evidence keeps the deployment on HOLD.

## Operator acceptance sequence (future supervised live deployment)

- In an isolated test installation, create a **new non-sensitive test account**, verify the dedicated HTTPS origin and sign in directly through the provider.
- Enroll a primary and backup authenticator in the provider; confirm both work and invalid/wrong-origin attempts fail. Do not save TOTP seeds or keys in the Hub.
- Close/lock browser, revoke a session, repeat from an approved client, test sensitive change step-up and denied stale credentials.
- Simulate lost primary authenticator using only the disposable test account, validate independent backup and emergency recovery, then revoke test sessions.
- Verify backups are encrypted, recovery is possible and no Hub logs, Chat, AI, Knowledge, telemetry or browser caches contain a master key or vault plaintext.
- Review evidence privately on the Windows server; only then consider the separately scoped Build 122 installed-host security acceptance. Source CI success alone is insufficient.

## Negative-test promise

The `vaultMfaReadiness.test.ts` suite enforces disabled enrollment, step-up, issuance, access and recovery, including when all untrusted review flags are forged. The Vault UI tests ensure an honest security-hold display without a form, button, network fetch or authenticator API call. These tests do not claim that the chosen provider's real WebAuthn implementation has been audited.
