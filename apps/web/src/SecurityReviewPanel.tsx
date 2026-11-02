import { useEffect, useRef, useState } from "react";

import { getSecurityPosture, type SecurityPostureResponse } from "./api";
import { CardHelp } from "./CommandShell";

export const ownerSecurityChecks = [
  "Confirm each enabled account still needs its assigned role; disable stale accounts through the existing Users workflow.",
  "Review active sessions and rotate credentials when an account or device is no longer trusted.",
  "Inspect the local audit log for unexpected actions, failures and missing outcomes; export only redacted metadata.",
  "On the installed Windows server, check Caddy TLS/certificate trust and the exact intended reverse-proxy listener.",
  "Independently confirm Tailscale access policies and Windows Firewall inbound rules; never assume a passing source build proves them.",
  "Document findings and independent owner sign-off outside this session; do not enable a private relay or alter access automatically.",
] as const;

/** Passive, owner-only configuration readback. No scans, writes or firewall changes. */
export function SecurityReviewPanel() {
  const [posture, setPosture] = useState<SecurityPostureResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const response = await getSecurityPosture(controller.signal);
      if (request.current === controller) setPosture(response);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setPosture(null);
      setError(caught instanceof Error ? caught.message : "Security readback failed.");
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }

  return <section className="panel" aria-labelledby="hub-security-review-title">
    <header className="hub-search-header"><div><p className="eyebrow">Build 225 · read-only security review</p>
      <h2 id="hub-security-review-title">Access, audit &amp; local network safeguards</h2></div>
      <CardHelp title="Security scope">Role and configuration counts come from the local Hub process. This does not inspect Windows Firewall, Caddy or Tailscale, verify TLS, scan network devices or prove an independent security audit.</CardHelp>
    </header>
    <p>Owner/Administrator-only manual review. No network probes, access changes, credentials or private relay actions.</p>
    <button type="button" disabled={loading} onClick={() => void refresh()}>{loading ? "Reading security posture…" : "Review local security posture"}</button>
    {error && <p role="alert">Security readback unavailable: {error}</p>}
    {!posture && !loading && !error && <p>No security posture sample requested yet.</p>}
    {posture && <div role="status" aria-live="polite">
      <p>Sampled {new Date(posture.sampled_at_utc).toLocaleString()} · configuration and aggregate counts only</p>
      <dl>
        {Object.entries(posture.role_counts).map(([role, counts]) => <div key={role}><dt>{role.replaceAll("_", " ")}</dt><dd>{counts.enabled} enabled / {counts.total} total</dd></div>)}
        <dt>Active sessions</dt><dd>{posture.active_session_count}</dd>
        <dt>Audit entries</dt><dd>{posture.audit_event_count}</dd>
        <dt>API listener</dt><dd>{posture.api_bind_scope === "loopback" ? "Loopback configured" : "Non-loopback: owner review required"}</dd>
        <dt>Secure-cookie setting</dt><dd>{posture.cookie_secure_configured ? "Enabled" : "Not enabled in application settings; verify deployment boundary"}</dd>
        <dt>CORS origins / wildcard</dt><dd>{posture.cors_origin_count} configured / {posture.cors_wildcard_configured ? "Wildcard needs review" : "No wildcard"}</dd>
        <dt>Session lifetime</dt><dd>{posture.session_max_hours} hours configured</dd>
        <dt>Caddy TLS, Tailscale ACL, Windows Firewall</dt><dd>Not inspected — owner device verification required</dd>
      </dl>
      <h3>Review findings and unverified boundaries</h3>
      <ul>{posture.findings.map(finding => <li key={finding}>{finding}</li>)}</ul>
    </div>}
    <h3>Owner review checklist (session only)</h3>
    <p>Local marks are planning aids, not signed acceptance or persistent evidence.</p>
    <ol>{ownerSecurityChecks.map((step, i) => <li key={step}><label><input type="checkbox" checked={done.includes(i)} onChange={event => setDone(current => event.target.checked ? [...current, i] : current.filter(value => value !== i))} />{step}</label></li>)}</ol>
    <p role="status">{done.length} of {ownerSecurityChecks.length} review steps marked locally; independent acceptance outstanding.</p>
    <button type="button" onClick={() => setDone([])}>Reset security checklist</button>
    <p>For audit inspection, open the existing <strong>Audit</strong> workspace. Its export contains at most 200 metadata-only rows and excludes arguments, results, identifiers and account names.</p>
  </section>;
}
