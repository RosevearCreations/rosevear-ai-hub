import { assessVaultSecurityArchitecture, vaultControls, vaultThreats } from "./vaultSecurityArchitecture";
import { assessVaultPreparation, vaultPreparationStages } from "./vaultPreparation";

/** Honest, non-interactive Build 119 design gateway; never requests or stores credentials. */
export function VaultArchitectureView() {
  const gate = assessVaultSecurityArchitecture();
  const preparation = assessVaultPreparation();

  return (
    <section className="vault-architecture" aria-label="Local password vault security architecture">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 120 · safe installation preparation</p>
          <h1>Private password vault</h1>
          <p className="lede">A separate locally hosted keeper is planned for each household member, opened from the Hub client through a dedicated private HTTPS address after security acceptance.</p>
        </div>
        <span className="vault-gate-badge">SECURITY HOLD</span>
      </header>

      <div className="vault-gate-warning" role="status">
        <strong>Do not enter real passwords yet.</strong>
        <p>This is the architecture and safety review—not a working vault. Credential entry, password retrieval, sharing, autofill and MFA are disabled. Nothing is installed on the Windows server by this screen.</p>
      </div>

      <section className="panel" aria-label="Vault isolation and client lock preparation">
        <div className="vault-gates-heading">
          <div><h2>Isolation and client-lock readiness</h2><p>Planning only. These checks cannot enable a vault, even when marked reviewed.</p></div>
          <span className="vault-gate-badge">{preparation.phase.replace("_", " ")}</span>
        </div>
        <details className="camera-acceptance-help">
          <summary><span aria-hidden="true">i</span> Before we install a password keeper</summary>
          <p>Choose and approve a supported provider, hosting resources and license first. Verify the private HTTPS address and independent lock, backup and recovery in an isolated test environment. Never paste a password, master key, recovery code or authenticator seed into Hub, Knowledge, chat or support tickets.</p>
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
        <p className="vault-architecture-note">Build 120 preparation: <strong>{preparation.production_security_acceptance}</strong>. Provider: not approved; service: not installed; client unlock: disabled. This screen contains no credential entry, activation control or vault network endpoint.</p>
      </section>

      <details className="camera-acceptance-help" open>
        <summary><span aria-hidden="true">i</span> How our vault will work</summary>
        <ol>
          <li>Sign into our Hub as usual and choose <strong>Vault</strong>. Hub authentication alone will not unlock passwords.</li>
          <li>After a separate reviewed vault server is installed, open its dedicated private HTTPS client. The Hub must never collect the master password or proxy a decrypted vault.</li>
          <li>Each household member unlocks their own vault with their own credentials and a second factor at login. Explicitly shared items remain separate from personal items.</li>
          <li>Keep recipes, car maintenance procedures and digital owners manuals in <strong>Knowledge</strong>, never passwords or recovery codes.</li>
          <li>Until Builds 120–122 are reviewed, continue using an existing trustworthy password manager and do not upload passwords here.</li>
        </ol>
      </details>

      <div className="vault-security-grid">
        <article className="vault-security-card">
          <p className="eyebrow">Data location</p>
          <h2>Our Windows server</h2>
          <p>Candidate: a maintained Bitwarden self-hosted service in a separately isolated runtime, with encrypted private vault records and no Hub database copies.</p>
          <small>Not selected or installed yet. Licensing, resource demands and secure HTTPS must be checked first.</small>
        </article>
        <article className="vault-security-card">
          <p className="eyebrow">Access</p>
          <h2>Hub shortcut, separate unlock</h2>
          <p>The future Hub shortcut may open the trusted vault web app, but the vault will keep its own login, session, lock timer and individual encryption keys.</p>
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

      <p className="vault-architecture-note">Security design result: <strong>{gate.production_security_acceptance}</strong> for real passwords. Build 120 is limited to preparation; a separately approved encrypted-vault installation, Build 121 two-factor and recovery, and Build 122 security tests and Windows acceptance must pass before any live password storage is permitted. Hub Secrets remains for integration tokens only; Knowledge and AI never get vault access.</p>
    </section>
  );
}
