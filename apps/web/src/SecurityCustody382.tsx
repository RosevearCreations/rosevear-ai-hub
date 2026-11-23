import {useEffect, useState, type FormEvent} from "react";

import {
  revokeMyOtherSessions382,
  securityCustody382Posture,
  type SecurityCustody382Posture,
  type SecuritySessionContainment382,
} from "./api";
import "./SecurityCustody382.css";

const CONSENT = "REVOKE MY OTHER SESSIONS";

/** Build382: no settings or credentials fetched; no automatic destructive work. */
export function SecurityCustody382() {
  const [posture, setPosture] = useState<SecurityCustody382Posture | null>(null);
  const [last, setLast] = useState<SecuritySessionContainment382 | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    securityCustody382Posture(controller.signal)
      .then(value => {if (!controller.signal.aborted) setPosture(value);})
      .catch(caught => {
        if (!controller.signal.aborted) setError(
          caught instanceof Error ? caught.message : "Security posture is unavailable.",
        );
      })
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, []);

  async function contain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || consent !== CONSENT || password.length < 12) return;
    setBusy(true);
    setError("");
    setLast(null);
    try {
      const result = await revokeMyOtherSessions382(password);
      setLast(result);
      setPosture(await securityCustody382Posture());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Session containment was not completed.");
    } finally {
      setPassword("");
      setConsent("");
      setBusy(false);
    }
  }

  return <div className="custody382">
    <header className="page-header">
      <div>
        <p className="eyebrow">Build 382 · Owner-only security and restore custody</p>
        <h1>Zero-Trust Security &amp; Independent Restore Review</h1>
        <p className="lede">Check local access controls, contain other owner sessions with
          fresh password confirmation, and follow the offline encrypted-copy
          restore procedure. Security certification remains <strong>FIELD HOLD</strong>
          until real-device and independent recovery evidence exists.</p>
      </div>
    </header>

    <section className="panel">
      <h2>Local security posture</h2>
      {loading && <p role="status">Checking local permission metadata…</p>}
      {posture && <dl className="custody382-statistics">
        <div><dt>Other active owner logins</dt><dd>{posture.activeOtherOwnerSessions}</dd></div>
        <div><dt>Local session lifetime</dt><dd>{posture.sessionMaxHours} hours</dd></div>
        <div><dt>Secure-cookie configuration</dt>
          <dd>{posture.cookieSecureConfigured ? "Enabled" : "Not enabled — review TLS boundary"}</dd></div>
        <div><dt>Enforced MFA</dt><dd>Not implemented — HOLD</dd></div>
        <div><dt>TLS certificate and key rotation</dt><dd>Not independently verified — HOLD</dd></div>
        <div><dt>Encrypted off-machine recovery</dt><dd>Not independently witnessed — HOLD</dd></div>
        <div><dt>Backup and audit retention targets</dt>
          <dd>{posture.backupRetentionTargetDays} / {posture.auditRetentionTargetDays} days; no auto-delete</dd></div>
        <div><dt>Dependency manifest</dt><dd>Declared source inventory, not an audited SBOM or CVE scan</dd></div>
      </dl>}
      <p>These status fields do not read secret values, private TLS keys, or household
        files, scan the network, or modify any installed services.</p>
    </section>

    <section className="panel">
      <h2>Contain other owner sessions — explicit action</h2>
      <p>Use this if another browser or computer signed in as our owner account
        should be disconnected. It revokes only <strong>other sessions of
        this exact owner account</strong>; the browser used for this action
        remains signed in. Household accounts and other owners are unaffected.
        It does not reset passwords or rotate encryption/TLS keys.</p>
      <form className="custody382-form" onSubmit={event => void contain(event)}>
        <label>Enter the owner's current password to reauthenticate
          <input type="password" autoComplete="current-password" minLength={12}
            maxLength={256} required value={password} disabled={busy}
            onChange={event => setPassword(event.target.value)} />
        </label>
        <label>Type <strong>{CONSENT}</strong> exactly to authorize revocation
          <input type="text" autoComplete="off" value={consent} disabled={busy}
            onChange={event => setConsent(event.target.value)} />
        </label>
        <button type="submit" className="primary-button" disabled={busy ||
          !posture || consent !== CONSENT || password.length < 12}>
          {busy ? "Revoking requested owner sessions…" : "Revoke my other sessions"}
        </button>
      </form>
      {last && <p role="status">Revoked {last.revokedCount} other owner session(s).
        Current session remains active; no other accounts were changed.</p>}
    </section>

    <section className="panel">
      <h2>Encrypted backup custody and independent restore</h2>
      <p>The offline <code>restore_custody382</code> verifier checks SHA-256
        byte identity between the original encrypted backup and a separate
        copy, then invokes the existing authenticated Build 050 restore drill
        <strong> on the copy only</strong> in disposable scratch storage.
        It verifies SQLite integrity and discards the temporary decrypted files.
        The program never overwrites the live Hub.</p>
      <pre>python -m rosevear_ai_hub.restore_custody382 verify-copy --source-archive
  &lt;original.hubbackup&gt; --copy-archive &lt;separate-copy.hubbackup&gt;
  --passphrase-file &lt;protected-local-file&gt; --work-dir &lt;existing-empty-scratch&gt;
  --evidence &lt;new-private-report.json&gt;</pre>
      <p>Run only on a supervised, trusted computer with an encrypted scratch
        drive and protected passphrase. Choose actual private paths locally;
        never paste paths, the passphrase or decrypted contents into chat.
        Source and copy must be distinct files in different folders.
        <strong> Distinct files alone do not establish physically independent
        storage or genuine recovery on another computer.</strong></p>
      <p>The owner must separately witness off-machine storage, check a
        restore on another approved machine, verify the Home Assistant VM,
        gateway/TLS keys and startup configuration, and document rollback
        before physical production may be certified.</p>
    </section>

    <section className="panel">
      <h2>Dependency review, key rotation and MFA</h2>
      <p>Generate a reproducible declared-dependency inventory without
        installing packages or contacting outside providers:</p>
      <pre>python -m rosevear_ai_hub.restore_custody382 dependency-manifest --repo-root .</pre>
      <p>This is a source manifest, <strong>not a transitive SBOM or
        vulnerability-scan clearance</strong>. Human review of the locked
        dependency tree, licenses and current security advisories remains required.</p>
      <ol>
        <li>Review account access, least-privilege roles, old sessions and Audit.</li>
        <li>Review key rotation through existing supervised Secrets controls and
          independently verify Caddy certificate trust, without exposing keys.</li>
        <li>Keep MFA and the household password vault disabled until a reviewed
          identity-provider integration is installed and independently tested.</li>
        <li>Retain a verified encrypted backup plus an independently stored copy.
          Set actual retention schedules only after approved rollback and
          destruction policy; Build 382 deletes nothing.</li>
      </ol>
    </section>
    {error && <p role="alert">{error}</p>}
  </div>;
}
