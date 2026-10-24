import { assessVaultSecurityArchitecture, vaultControls, vaultThreats } from "./vaultSecurityArchitecture";
import { assessVaultPreparation, vaultPreparationStages } from "./vaultPreparation";
import { assessVaultMfaReadiness, vaultMfaDenialCases, vaultMfaReviewGates } from "./vaultMfaReadiness";
import { assessVaultSecurityVerification, vaultVerificationChecks } from "./vaultSecurityVerification";
import { assessVaultProviderDecision } from "./vaultProviderDecision";
import { assessLocalVaultBlueprint, localVaultRecordKinds, localVaultSecurityGates, localVaultThreats } from "./localVaultBlueprint";
import { assessVaultThreatCryptoReview, vaultCryptoCandidates, vaultDesignDecisions, vaultThreatScenarios, vaultTrustBoundaries } from "./vaultThreatCryptoReview";
import { assessVaultSyntheticHarness, vaultSyntheticCases } from "./vaultSyntheticHarnessPolicy";
import { assessVaultServiceBoundary, vaultServiceBoundaries, vaultServiceDenialCases } from "./vaultServiceBoundary";
import { assessVaultDocumentPreparation, vaultDocumentDenialCases, vaultDocumentReviewStages } from "./vaultDocumentPreparation";

/** Honest, non-interactive Build 119 design gateway; never requests or stores credentials. */
export function VaultArchitectureView() {
  const gate = assessVaultSecurityArchitecture();
  const preparation = assessVaultPreparation();
  const mfa = assessVaultMfaReadiness();
  const verification = assessVaultSecurityVerification();
  const provider = assessVaultProviderDecision();
  const local = assessLocalVaultBlueprint();
  const threatReview = assessVaultThreatCryptoReview();
  const synthetic = assessVaultSyntheticHarness();
  const servicePreview = assessVaultServiceBoundary();
  const documents = assessVaultDocumentPreparation();

  return (
    <section className="vault-architecture" aria-label="Local password vault security architecture">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 128 · synthetic document integrity preparation</p>
          <h1>Private password and document vault</h1>
          <p className="lede">We will build and own the software and keep our encrypted data on our Windows server. The future vault will remain separate from the Hub, with a private HTTPS origin and individual household accounts.</p>
        </div>
        <span className="vault-gate-badge">SECURITY HOLD</span>
      </header>

      <div className="vault-gate-warning" role="status">
        <strong>Do not enter real passwords yet.</strong>
        <p>This is the first-party architecture and safety review—not a working vault. Password entry, document uploads, retrieval, sharing, autofill and MFA are disabled. Nothing is installed on the Windows server by this screen.</p>
      </div>

      <section className="panel" aria-label="Build 128 disposable document pipeline and integrity review">
        <div className="vault-gates-heading">
          <div>
            <h2>Private document pipeline &amp; integrity preparation</h2>
            <p>Encrypted chunk tests use invented bytes only. No household document is accepted, uploaded, previewed, downloaded or stored. Future file safety and Windows acceptance remain separate reviews.</p>
          </div>
          <span className="vault-gate-badge">DOCUMENTS OFF · {documents.production_security_acceptance}</span>
        </div>
        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> What a passing document test means</summary>
          <ol>
            <li>Test-only Web Crypto uses temporary, non-exportable AES-256-GCM keys and invented in-memory bytes. The cryptographic chunk code is not shipped into our Hub app.</li>
            <li>Chunks are bound to dummy owner, document, revision, fresh envelope ID, declared length, chunk count and position. Tampered, missing or mixed chunks fail the test harness.</li>
            <li>An entire valid old encrypted document can still be replayed: a future independently reviewed service must enforce monotonic versions and reliable recovery.</li>
            <li>Real PDFs, images and documents need separate type validation, active-content defences, upload limits and Windows field review. Do not use this page to enter or import private files.</li>
          </ol>
        </details>
        <h3>Six document handling boundaries</h3>
        <div className="vault-security-grid">
          {vaultDocumentReviewStages.map(item => <article className="vault-security-card" key={item.id}>
            <p className="eyebrow">Review required · not deployed</p><h2>{item.title}</h2><p>{item.requirement}</p>
          </article>)}
        </div>
        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> Document integrity denial and replay cases</summary>
          <div className="vault-threats">
            {vaultDocumentDenialCases.map(item => <article key={item.id}><strong>{item.title}</strong><p>{item.expected}</p></article>)}
          </div>
        </details>
        <p className="vault-architecture-note">Document contract: <strong>{documents.phase}</strong>. File pickers, upload APIs, preview/download, permanent encrypted storage, vault sessions, MFA and installed Windows document services all remain <strong>DISABLED / HOLD</strong>.</p>
      </section>

      <section className="panel" aria-label="Build 127 isolated vault service and identity review">
        <div className="vault-gates-heading">
          <div>
            <h2>Independent vault service &amp; family identity boundary</h2>
            <p>A separate HTTPS origin, Windows process, per-person identity and client-held keys are required before we can build a real password keeper. These are security contracts only; no vault server was started.</p>
          </div>
          <span className="vault-gate-badge">SERVICE OFF · {servicePreview.production_security_acceptance}</span>
        </div>
        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> Why a Hub administrator cannot unlock the vault</summary>
          <ol>
            <li>The Hub login cookie and administrator role will never count as independent vault login, MFA or recovery authority.</li>
            <li>Every real vault endpoint must later verify its own identity, origin, authorization and separately held encryption keys before any secret data is admitted.</li>
            <li>Our tests simulate forged sessions and factor approvals; they cannot authorize a service that does not exist. All seven operation types remain denied to every actor.</li>
            <li>An independent reviewer and a supervised Windows-only pilot are required before configuring the private hostname or installing a vault process.</li>
          </ol>
        </details>
        <h3>Five isolated-service boundaries</h3>
        <div className="vault-security-grid">
          {vaultServiceBoundaries.map(item => <article className="vault-security-card" key={item.id}>
            <p className="eyebrow">Proposed boundary · not deployed</p><h2>{item.title}</h2><p>{item.requirement}</p>
          </article>)}
        </div>
        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> Identity and service denial cases</summary>
          <div className="vault-threats">
            {vaultServiceDenialCases.map(item => <article key={item.id}>
              <strong>{item.title}</strong><p>{item.expected}</p>
            </article>)}
          </div>
        </details>
        <p className="vault-architecture-note">Current contract: <strong>{servicePreview.denial_reason}</strong>. No origin, separate identity provider, Windows vault process, request handler, live MFA, credential field, storage or upload is enabled.</p>
      </section>

      <section className="panel" aria-label="Build 126 disposable cryptography acceptance">
        <div className="vault-gates-heading">
          <div>
            <h2>Disposable-data encryption &amp; tamper tests</h2>
            <p>We approved the browser's built-in Web Crypto AES-256-GCM for isolated synthetic test fixtures only. No cryptographic package, vault service, persistent key, password input or document upload was introduced.</p>
          </div>
          <span className="vault-gate-badge">LIVE VAULT {synthetic.production_security_acceptance}</span>
        </div>
        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> What the test results do—and do not—prove</summary>
          <ol>
            <li>Automated tests use temporary non-exportable AES-GCM keys, new random IVs and invented values. Test-only code is not imported into the customer-facing Hub application.</li>
            <li>Tests exercise corrupted ciphertext, wrong authentication metadata, invalid keys and truncation. Identical encrypted records can still be replayed: AES-GCM does not provide a rollback ledger.</li>
            <li>Passing source tests does not establish safe passphrase derivation, real browser security, per-person authorization, document-stream encryption, MFA, recovery, or successful Windows field testing.</li>
            <li>All real passwords, private files and recovery information remain prohibited until separately reviewed and approved.</li>
          </ol>
        </details>
        <div className="vault-security-grid">
          {vaultSyntheticCases.map(item => <article className="vault-security-card" key={item.id}>
            <p className="eyebrow">Synthetic test case</p><h2>{item.title}</h2><p>{item.expected}</p>
            <small>Source-test evidence only · no field security certification</small>
          </article>)}
        </div>
        <p className="vault-architecture-note">Approved test primitive: <strong>{synthetic.owner_approved_test_primitive}</strong>. This approval is limited to disposable, in-memory fixtures; production cryptography, vault access, actual account authentication and storage remain <strong>{synthetic.production_security_acceptance}</strong>.</p>
      </section>

      <section className="panel" aria-label="First-party vault threat model and cryptography review">
        <div className="vault-gates-heading">
          <div>
            <h2>Threat model &amp; encryption library review</h2>
            <p>Map how our own local vault could be attacked, then independently review the standard libraries and test evidence before choosing a cryptographic implementation.</p>
          </div>
          <span className="vault-gate-badge">CRYPTO UNAPPROVED · {threatReview.production_security_acceptance}</span>
        </div>
        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> Why this review matters</summary>
          <ol>
            <li>We are building our own vault software, but will rely on well-studied encryption and authentication standards. No vendor gets our stored passwords or documents.</li>
            <li>All library choices below are <strong>candidates</strong>, not installed software or an independent security certification.</li>
            <li>Every attack must have a denial test, including stolen-server backups, forged sharing grants, damaged files, wrong-origin MFA and untrusted PDF previews.</li>
            <li>The owner has now approved a narrow Web Crypto AES-GCM synthetic-only test. The seven broader vault design decisions, real library/dependency approvals and field acceptance remain unresolved.</li>
          </ol>
        </details>

        <h3>Four boundaries we must keep separate</h3>
        <div className="vault-security-grid">
          {vaultTrustBoundaries.map(item => (
            <article className="vault-security-card" key={item.id}>
              <p className="eyebrow">Trust boundary</p><h2>{item.title}</h2><p>{item.detail}</p><small>Planned separation · unverified</small>
            </article>
          ))}
        </div>

        <h3>Candidate standards and libraries</h3>
        <div className="vault-security-grid">
          {vaultCryptoCandidates.map(item => (
            <article className="vault-security-card" key={item.id}>
              <p className="eyebrow">Review candidate · not approved</p><h2>{item.title}</h2><p>{item.role}</p>
              <small>Primary reference: {item.source}</small><p>{item.risk}</p>
            </article>
          ))}
        </div>

        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> Attack and denial-test checklist</summary>
          <div className="vault-threats">
            {vaultThreatScenarios.map(item => (
              <article key={item.id}>
                <p className="eyebrow">{item.category}</p><strong>{item.attack}</strong>
                <p><strong>Required defence:</strong> {item.protection}</p>
                <p><strong>Must fail:</strong> {item.negativeTest}</p>
              </article>
            ))}
          </div>
        </details>

        <h3>Seven design decisions still on HOLD</h3>
        <div className="vault-security-grid">
          {vaultDesignDecisions.map((item, index) => (
            <article className="vault-security-card" key={item.id}>
              <p className="eyebrow">Decision {index + 1} / {vaultDesignDecisions.length}</p>
              <h2>{item.question}</h2><p>{item.evidence}</p><small>Not independently reviewed · no activation</small>
            </article>
          ))}
        </div>
        <p className="vault-architecture-note">Build 125 review status: <strong>{threatReview.production_security_acceptance}</strong>. No library is approved, no encryption runtime installed, and no credential intake, document upload, vault API, MFA enrollment or recovery service is enabled—even when a checklist is marked complete.</p>
      </section>

      <section className="panel" aria-label="First-party local vault implementation blueprint">
        <div className="vault-gates-heading">
          <div><h2>Our own local vault: direction selected</h2><p>No third-party vault hosting or commercial password-manager service is planned. Security review and physical deployment approval are still required.</p></div>
          <span className="vault-gate-badge">SECURITY REVIEW REQUIRED</span>
        </div>
        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> What a first-party vault means</summary>
          <ol>
            <li>We own the vault application and encrypted files. Local hosting reduces reliance on external operators but does not make an unreviewed program hack-proof.</li>
            <li>Build on established, reviewed encryption and authentication standards; never invent custom encryption algorithms or expose our master keys to Hub services.</li>
            <li>Give each person a private vault; require explicit sharing, locked clients, MFA and encrypted offline document backups.</li>
            <li>Only after independent security review, approve an isolated disposable-account pilot and witnessed Windows acceptance. Never paste secrets or recovery codes into Hub, AI chat or GitHub.</li>
          </ol>
        </details>
        <h3>Information the future vault may hold</h3>
        <div className="vault-security-grid">
          {localVaultRecordKinds.map(kind => <article className="vault-security-card" key={kind.id}>
            <p className="eyebrow">Planned record type</p><h2>{kind.title}</h2><p>{kind.scope}</p><small>Design only · no live storage</small>
          </article>)}
        </div>
        <h3>Eight safety gates before testing with real data</h3>
        <div className="vault-security-grid">
          {localVaultSecurityGates.map((item, index) => <article className="vault-security-card" key={item.id}>
            <p className="eyebrow">Security gate {index + 1} / {localVaultSecurityGates.length}</p>
            <h2>{item.title}</h2><p>{item.detail}</p><small>Not independently verified</small>
          </article>)}
        </div>
        <h3>Threats we still need to prevent</h3>
        <div className="vault-threats">
          {localVaultThreats.map(item => <article key={item.threat}><strong>{item.threat}</strong><p>{item.mitigation}</p></article>)}
        </div>
        <p className="vault-architecture-note">Build 124 source design: <strong>{local.production_security_acceptance}</strong>. Owner direction: our own local code. Security approval, independent review, service installation, password storage, document upload and MFA are all still disabled—even if a checklist is marked complete. The Build 123 vendor-comparison packet is superseded; its old status remains <strong>{provider.production_security_acceptance}</strong>.</p>
      </section>

      <section className="panel" aria-label="Vault security verification and Windows owner acceptance">
        <div className="vault-gates-heading">
          <div><h2>Windows vault security verification</h2><p>Eight independent on-device checks must be adapted to our own app. GitHub build success is not installed-vault security approval.</p></div>
          <span className="vault-gate-badge">FIELD ACCEPTANCE {verification.production_security_acceptance}</span>
        </div>
        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> How to safely verify our future Windows vault</summary>
          <ol>
            <li>Do not begin until our design receives an independent security review and we explicitly approve an isolated Windows installation with private HTTPS.</li>
            <li>Use disposable test accounts and credentials only in the isolated vault test client, never inside Hub, Knowledge, chat or screenshots.</li>
            <li>Witness rejected invalid MFA, client idle lock, revoked sessions, isolated encrypted backup/restore and safe Windows reboot on our actual server.</li>
            <li>Keep results in a private sanitized owner record. A missing, failing or unobserved test keeps the security hold.</li>
          </ol>
        </details>
        <div className="vault-security-grid">
          {vaultVerificationChecks.map((check, index) => (
            <article className="vault-security-card" key={check.id}>
              <p className="eyebrow">Field test {index + 1} / {vaultVerificationChecks.length}</p>
              <h2>{check.title}</h2><p>{check.detail}</p><small>Not performed · owner security hold</small>
            </article>
          ))}
        </div>
        <p className="vault-architecture-note">Build 122 source review: <strong>{verification.production_security_acceptance}</strong> for the installed Windows vault. Our own implementation is unreviewed, field evidence unavailable, real MFA disabled and password intake blocked. These checks do not collect credentials or claim that the physical server was tested.</p>
      </section>

      <section className="panel" aria-label="Vault isolation and client lock preparation">
        <div className="vault-gates-heading">
          <div><h2>Isolation and client-lock readiness</h2><p>Planning only. These checks cannot enable a vault, even when marked reviewed.</p></div>
          <span className="vault-gate-badge">{preparation.phase.replace("_", " ")}</span>
        </div>
        <details className="camera-acceptance-help">
          <summary><span aria-hidden="true">i</span> Before we install our local vault</summary>
          <p>Independently review our own code, vetted cryptographic libraries, Windows hosting isolation and actual data model first. Verify private HTTPS, lock, encrypted document backup and recovery in an isolated test environment. Never paste a password, master key, recovery code or authenticator seed into Hub, Knowledge, chat or support tickets.</p>
        </details>
        <div className="vault-security-grid">
          {vaultPreparationStages.map((stage, index) => (
            <article className="vault-security-card" key={stage.id}>
              <p className="eyebrow">Preparation {index + 1} / {vaultPreparationStages.length}</p>
              <h2>{stage.title}</h2>
              <p>{stage.detail}</p>
              <small>Not verified · no live service enabled</small>
            </article>
          ))}
        </div>
        <p className="vault-architecture-note">Build 120 preparation: <strong>{preparation.production_security_acceptance}</strong>. Our design: not security-approved; service: not installed; client unlock: disabled. This screen contains no credential entry, activation control or vault network endpoint.</p>
      </section>

      <section className="panel" aria-label="Hardware key and emergency recovery readiness">
        <div className="vault-gates-heading">
          <div><h2>Passkeys, step-up and emergency recovery</h2><p>Eight required reviews for our future isolated vault application. No authenticator can be enrolled from the Hub.</p></div>
          <span className="vault-gate-badge">{mfa.production_security_acceptance} · MFA OFF</span>
        </div>
        <details className="camera-acceptance-help" open>
          <summary><span aria-hidden="true">i</span> What two-factor protection will require</summary>
          <ol>
            <li>Independently review the future vault authenticator design; Hub login is not an unlock factor.</li>
            <li>Every household member must enroll a primary key and independently available backup directly in the isolated vault app, over its verified HTTPS origin.</li>
            <li>Review step-up prompts, session revocation and a separately verified lost-device recovery procedure before entering real passwords.</li>
            <li>Never type or upload recovery codes, authenticator seeds, passphrases or private keys into Hub, Knowledge, AI chat or this review screen.</li>
          </ol>
        </details>
        <div className="vault-security-grid">
          {vaultMfaReviewGates.map((item, index) => (
            <article className="vault-security-card" key={item.id}>
              <p className="eyebrow">Security review {index + 1} / {vaultMfaReviewGates.length}</p>
              <h2>{item.title}</h2><p>{item.detail}</p><small>Not verified · security hold</small>
            </article>
          ))}
        </div>
        <h3>Cases that must never bypass verification</h3>
        <div className="vault-threats">
          {vaultMfaDenialCases.map(item => <article key={item.situation}><strong>{item.situation}</strong><p>{item.requirement}</p></article>)}
        </div>
        <p className="vault-architecture-note">Build 121 policy review: <strong>{mfa.production_security_acceptance}</strong>. Our implementation not security-approved; vault access denied; authenticator enrollment, step-up and recovery code issuance disabled. These cards never assert working two-factor security.</p>
      </section>

      <details className="camera-acceptance-help" open>
        <summary><span aria-hidden="true">i</span> How our vault will work</summary>
        <ol>
          <li>Sign into our Hub as usual and choose <strong>Vault</strong>. Hub authentication alone will not unlock passwords.</li>
          <li>After our separately reviewed local vault service is installed, open its dedicated private HTTPS client. The Hub must never collect the master password or proxy decrypted entries or files.</li>
          <li>Each household member unlocks their own vault with their own credentials and a second factor at login. Explicitly shared items remain separate from personal items.</li>
          <li>Keep public recipes, car maintenance procedures and ordinary owners manuals in <strong>Knowledge</strong>; keep private documents in the encrypted vault once approved, never in AI indexes.</li>
          <li>Until our design passes independent review and field acceptance, keep using our current trusted storage and do not upload passwords or private documents here.</li>
        </ol>
      </details>

      <div className="vault-security-grid">
        <article className="vault-security-card">
          <p className="eyebrow">Data location</p>
          <h2>Our Windows server</h2>
          <p>Our own isolated vault service, built with reviewed security libraries, encrypted personal records and documents, and no Hub database copies.</p>
          <small>Not installed. Hardware capacity, isolation and safe private HTTPS must be checked first.</small>
        </article>
        <article className="vault-security-card">
          <p className="eyebrow">Access</p>
          <h2>Hub shortcut, separate unlock</h2>
          <p>The future Hub shortcut may open our dedicated private vault web app, but it will keep its own login, session, lock timer and individual encryption keys.</p>
          <small>No password fields or vault API are present in Build 119.</small>
        </article>
        <article className="vault-security-card">
          <p className="eyebrow">Second factor</p>
          <h2>Security key / passkey</h2>
          <p>Plan for phishing-resistant FIDO2/WebAuthn two-step login, a backup authenticator and an offline recovery process.</p>
          <small>Two-factor protection is a requirement, not active yet.</small>
        </article>
      </div>

      <section className="panel" aria-label="Security design review gates">
        <div className="vault-gates-heading">
          <div><h2>Required security gates</h2><p>These are pending technical and owner acceptance, not toggles that activate the vault.</p></div>
          <strong>{gate.review_progress.reviewed} / {gate.review_progress.required} verified</strong>
        </div>
        <ol className="vault-gates-list">
          {vaultControls.map(control => (
            <li key={control.id}>
              <span className="vault-gate-dot" aria-hidden="true" />
              <div><strong>{control.title}</strong><p>{control.detail}</p></div>
              <span className="vault-gate-pending">Pending</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel" aria-label="Security threat and mitigation plan">
        <h2>Threats we are designing against</h2>
        <div className="vault-threats">
          {vaultThreats.map(item => <article key={item.threat}><strong>{item.threat}</strong><p>{item.boundary}</p></article>)}
        </div>
      </section>

      <p className="vault-architecture-note">Security design result: <strong>{gate.production_security_acceptance}</strong> for real passwords and private documents. Build 124 selects our first-party local development direction only; independent security review, isolated encryption implementation, real MFA, negative tests and owner-observed Windows acceptance are mandatory before any live storage. Hub Secrets remains for integration tokens only; Knowledge and AI never get vault access.</p>
    </section>
  );
}
