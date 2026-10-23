# Build 119 — Security-Gated Local Household Password Vault Architecture

Status: **ARCHITECTURE ONLY — LIVE PASSWORD INTAKE DISABLED.** This build does not deploy a password manager, create a credential table, provision keys, set up MFA or collect passwords. Passing CI does **not** grant permission to store real credentials.

## Owner requirement and boundary

Our proposed household password keeper should retain encrypted records on our own Windows home server, open conveniently from the signed-in Hub client, support individual members and explicitly shared items, and require strong two-step verification. The existing Hub **Secrets** stores server integration tokens that are intentionally write-only; **Knowledge** contains manuals, recipes and repair processes; neither becomes a household password vault. The assistant, tools, automations, camera services, Knowledge indexing, logs and backup exports must never see a vault master password, unencrypted entries, keys, TOTP seeds or recovery codes.

Build 119 adds the authenticated client **Vault** section showing this architecture and ten security gates. It has no editable fields, network requests, vault routes, proxy, iframe, API token handling, local browser persistence or database migration. Its `assessVaultSecurityArchitecture` result always keeps `credential_intake=DISABLED`, `vault_endpoint_available=false`, `mfa_enforced=false`, and `production_security_acceptance=HOLD`, **even if** someone forges all gate review flags.

## Architecture recommendation: reviewed separate vault, not homemade cryptography

Do **not** implement a new password-encryption format or repurpose the Hub encryption key. We favor investigating **official self-hosted Bitwarden Lite** as the first candidate because its reviewed client ecosystem separates encryption/unlock from server storage, supports browser, desktop and mobile clients, and the one-container Lite design is for personal/home-lab use. There must be a formal owner acceptance before choosing it: current hardware capacity, Docker isolation, installation and update responsibilities, HTTPS trusted origin, offline restore, free-tier/sharing terms, and authenticator/device support must pass. Lite being a candidate **is not** provider acceptance, and nothing is installed by this build.

Alternatives:

| Option | Merits | Build 119 decision |
| --- | --- | --- |
| Official Bitwarden Lite | Official, maintained lightweight self-host; separate supported clients; SQLite/MariaDB/Postgres options | **Preferred evaluation candidate**, not installed; confirm personal-use-only scope, licensing for shared entries, Windows container runtime, privacy and MFA |
| Bitwarden standard self-host | Official Windows path and richer operations | Consider only if Lite cannot meet required guarantees; extra containers/MSSQL/RAM are significant on our HA/Ollama/Windows home server |
| KeePassXC local encrypted database | Mature offline single-user portable vault; no server required | Possible individual/offline fallback, but shared multi-device sync/recovery and trustworthy Hub-client integration require separate design |
| Custom Hub-managed password database | Easy superficial UI integration | **Rejected** absent independent cryptographic review and a vetted security client; high exposure to Hub sessions, XSS, prompts, backups and accidental logs |

As of 2026-10-23, Bitwarden documents that self-hosting is free for personal core use, **but self-hosted organizations/sharing may require paid enterprise licensing**; do not promise free household shared collections without confirming current provider terms. Do not enroll real passwords or make an automatic service installation from this research.

Provider sources (verify before Build 120 deployment):

- [Official self-host options and Lite scope](https://bitwarden.com/help/self-host-bitwarden/)
- [Bitwarden Lite install guide](https://bitwarden.com/help/install-and-deploy-lite/)
- [Bitwarden self-hosted database options](https://bitwarden.com/help/database-options/)
- [Official server hosting and licensing](https://bitwarden.com/help/licensing-on-premise/)
- [Bitwarden two-step login methods](https://bitwarden.com/help/setup-two-step-login/)
- [Bitwarden encryption protocol](https://bitwarden.com/help/what-encryption-is-used/)
- [Official server backup guidance](https://bitwarden.com/help/backup-on-premise/)
- [Official network/proxy requirements](https://bitwarden.com/help/networking-requirements/)

## Expected private topology — not implemented

1. Existing Hub authenticated client: a **shortcut only** opens a pinned, dedicated vault HTTPS origin in a new top-level browser context; the Hub never embeds the vault in an iframe, steals its cookies, forwards master-password forms or decrypts entries.
2. Independent reviewed vault web/desktop/mobile client performs provider-supported encryption, login, unlocking and user-visible two-step challenges. Password autofill remains within the vetted client/extension, **not** the Hub UI.
3. Independent local vault service and separately encrypted database/storage run in a dedicated isolated runtime on Windows (or a narrowly scoped VM); bind to loopback/private interfaces and avoid ports/cookies conflicting with Caddy, Hub API, HA VM, MQTT, go2rtc and Ollama.
4. Private HTTPS uses a trusted hostname and certificate reachable on an allowlisted home subnet and tightly controlled Tailscale path; never expose router port forwarding, Tailscale Funnel, public tunnels or insecure HTTP. Verify all provider WebSocket/reverse-proxy requirements separately.
5. Per-user accounts are private, and intentional sharing relies on explicitly permissioned provider-backed collections only after checking plan/license. Being a Hub owner/admin must **not** grant the ability to decrypt another family member's private vault.
6. No external cloud sync is silently enabled. Providers may have optional outbound dependency for licensing, push or update: inspect and approve these individually before deployment.

## Mandatory threat-model controls and acceptance evidence

| Risk | Required control | Evidence / fail-closed acceptance |
| --- | --- | --- |
| Compromised Windows host or database snapshot | Provider-reviewed client-side zero-knowledge encryption, distinct keys and isolated service/data | Inspect provider security model, mounted paths, ACLs and backup extraction; no plaintext on host |
| Shared computer / stolen phone | Per-member identities, short auto-lock, secondary unlock and remote session/device revocation | Owner and family dry-run with lost-device scenario; no cross-person data disclosure |
| Phishing / malicious login page | Verified HTTPS origin plus FIDO2/WebAuthn security keys or equivalent phishing-resistant second factor | Real challenge on approved client and negative assertion on untrusted origin; alternate factor enrolled |
| MFA bypass by Hub owner or recovery flow | Vault-owned 2FA with separate master-password key; audited recovery that cannot silently bypass vault protection | Negative tests for stolen Hub admin cookie, invalid MFA and unauthorised emergency recovery |
| Malware / injected prompt / browser XSS | Hard service separation; no Hub backend `/vault` CRUD, AI tool, Knowledge ingest or shared decrypted storage | Tests for request/log/body/cache leak and CSP; provider app not embedded in Hub iframe |
| Unexpected LAN / Internet reachability | Dedicated private origin, Caddy or approved vault reverse proxy, allowlisted clients and no public forwarding | Server-side binding, firewall + restricted tailnet check before any real account |
| Lost encryption key or failed update | Separate encrypted off-machine backup and tested offline restore including attachments and configuration | Isolated restore from current version; verified recovery documents kept offline, never in GitHub/Knowledge |
| CI incorrectly interpreted as field security | Owner-controlled physical Windows, client and MFA acceptance beyond GitHub source checks | CI release GREEN may coexist with **PASSWORD_VAULT_HOLD** until owner explicitly accepts installed environment |

## Review gates and responsibilities

Build 119 UI enumerates **ten** pending gates: reviewed provider, service isolation, individual identity, client-managed cryptography, private HTTPS, MFA, client lock/revocation, encrypted recovery, leakage testing, Windows owner acceptance. A UI click cannot set any gate to complete in this milestone.

Never reuse `SECRET_ENCRYPTION_KEY`, old HA credentials, Hub sign-in, MQTT secret, private Caddy key, or any chat-export data as the password keeper's master key or factor. Do not share credentials, vault snapshots or authenticator seeds in a GitHub issue, PR, automated screenshot or ChatGPT conversation.

## Subsequent stages already queued

- **Build 120** — Choose approved provider only after owner confirms license/resource/hosting terms; set up isolated encrypted local vault and client lock with no Hub server decryption. No automatic migration of real passwords.
- **Build 121** — Real FIDO2/WebAuthn second factor, backup key, lost-device recovery and private HTTPS step-up checks. Verify enforced login and revoke sessions. Do not call a password-only vault 2FA-protected.
- **Build 122** — Threat-model regression suite, negative secret-leakage testing, encrypted offline restore, Windows installation/boot resilience and household owner acceptance. Only this stage can consider lifting the separate field-security hold.

## Build 119 release verification

- Static safe architecture module and authenticated Hub Vault page never accept user-entered secrets.
- Automated tests enforce unconditional credential-intake HOLD, even when every review gate is forged as completed.
- Existing Hub auth, Secrets, Knowledge, Caddy, Tailscale, HA/MQTT/Ollama/camera services, Windows startup and databases remain unchanged.
- Mark GitHub promotion GREEN only after independent PR, `dev` and `main` CI checks; record installed security field acceptance separately as HOLD.
