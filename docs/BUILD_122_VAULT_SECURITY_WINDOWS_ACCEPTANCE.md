# Build 122 — Password vault security verification and Windows owner acceptance

## Boundary: source release vs live security

Builds 119–121 deliberately shipped architecture and preparatory gates only. The owner has not yet approved an independent password manager, Windows hosting resources/license or its security design. Consequently this Build 122 implements only a **read-only security verification workbench and operator runbook**, not a live vault or Windows field acceptance. The Hub has no vault password input, no live vault endpoint, no authenticator enrollment, no recovery-code issuance, no decrypted vault tools, no runtime installation and no device/service restarts. `assessVaultSecurityVerification()` always reports `DENY` and `HOLD`, even if all review evidence is self-marked successful.

The five GitHub Actions checks certify source compilation and tests, **not** trusted HTTPS on the home LAN, Tailscale restrictions, provider cryptography, actual MFA, restoration or the installed Windows host. Only owner-supervised in-person testing of a separately approved provider can close that field hold. Do not upload screenshots showing credentials, authenticator recovery codes, master keys, backup passwords or network secrets.

## Future owner acceptance checklist (disposable test accounts only)

| Gate | What to demonstrate privately | What must fail closed |
| --- | --- | --- |
| Provider & isolation | Approved version/license, dedicated runtime identity and storage, separate household accounts and explicit sharing | Hub admin access or Knowledge/AI tools cannot read private entries |
| Client encryption | Provider-supported audited design, ciphertext on server/backup, correct key rotation | Logs or server API do not reveal master keys or plaintext |
| Private HTTPS | Dedicated trusted certificate/hostname on scoped LAN and permitted Tailscale clients | HTTP downgrade, wrong origin, public router path and cross-origin cookie sharing |
| MFA | Real primary and backup key/passkey on a disposable account | Missing, replayed, expired, revoked and wrong-origin assertions are rejected |
| Lock/revocation | Idle timeout, logout, device removal, locked shared workstation, separate household identity | Lost device, stolen Hub cookie or stale vault session cannot unlock secrets |
| Encrypted backup | Offline encrypted backup and test restore into a separate isolated instance; recovery key kept elsewhere | Missing/wrong key fails without leaking content or silently cloud syncing |
| Leakage | Private inspection of browser cache, clipboard behavior, logs, error reports, AI, Knowledge and exports | No plaintext/recovery material leaves the independent vault boundary |
| Windows reboot | Owner restarts actual Hub machine under supervision; checks service order, firewall, private HTTPS, client access and post-reboot lock/MFA | No automatic unlock, lost isolation, changed identity or unreviewed external access |

## Safe test sequence

1. **Prerequisite hold:** obtain explicit owner approval of provider, license, version-pinned official installer, distinct runtime identity, private origin and backup approach. Without approval, stop here and keep using the existing external password manager.
2. On an isolated instance, create disposable non-sensitive test accounts directly in the approved password manager; never paste a real household secret into the Hub, this document or a support ticket.
3. Capture **sanitized** build/version, timestamp, pass/fail/unknown, reviewer, and test condition locally in a private owner-controlled record. No raw tokens, authenticator identifiers, private URLs, code values or recovery material.
4. Run each gate and negative case. A skipped, expired, stale, failed or unobserved test remains a HOLD. On new provider version, certificate, key policy or account configuration, invalidate prior acceptance.
5. Confirm that the backup restore uses an isolated staging location and separately protected recovery material; never overwrite the production database during a drill.
6. Verify actual Windows reboot, independent provider lock/unlock and restricted LAN/Tailscale clients in the owner's presence. Reconfirm sessions are locked afterward.
7. An owner and independent reviewer may separately record acceptance only after actual evidence is complete and the security implementation has passed review. This Build 122 UI cannot issue that acceptance or remove its HOLD.

## Source test coverage

`vaultSecurityVerification.test.ts` verifies that no provider/Windows field evidence can be assumed, that forged complete checklists never unlock the vault and that failed MFA/leak checks count as failures without bypass. `VaultArchitectureView.test.tsx` ensures clear field-HOLD language and no network request, credential fields, submit forms or activation buttons on the review screen.

## After Build 122

Do not treat Build 123 as automatic live activation. First request a separate owner decision on the provider and a security deployment review. Only then schedule an independent implementation and installed-host acceptance release.
