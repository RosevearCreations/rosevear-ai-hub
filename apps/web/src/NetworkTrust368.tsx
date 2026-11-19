import { useEffect, useState } from "react";

import {
  approveNetworkScope368, decideNetworkIdentity368, getNetworkTrust368,
  recordNetworkClaim368, type AuthRole, type NetworkTrust368Scope,
  type NetworkTrust368State,
} from "./api";

/** Owner only. No discovery or device-control browser actions are exposed. */
export function NetworkTrust368({ role }: { role: AuthRole }) {
  const [state, setState] = useState<NetworkTrust368State | null>(null);
  const [failure, setFailure] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [approval, setApproval] = useState("");
  const [source, setSource] = useState<"manual" | "ha_device" | "ha_entity" | "camera" | "mqtt">("manual");
  const [sourceId, setSourceId] = useState("");
  const [ip, setIp] = useState("");
  const [leaseRef, setLeaseRef] = useState("");

  async function refresh() {
    try {
      setState(await getNetworkTrust368());
      setFailure("");
    } catch (caught) {
      setFailure(caught instanceof Error ? caught.message : "Trust registry unavailable");
    }
  }

  useEffect(() => {
    if (role === "owner") void refresh();
  }, [role]);

  async function action(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    setFailure("");
    setResult("");
    try {
      await operation();
      setResult(success);
      await refresh();
    } catch (caught) {
      setFailure(caught instanceof Error ? caught.message : "Action denied; review scope and permissions");
    } finally {
      setBusy(false);
    }
  }

  if (role !== "owner") return null;
  return (
    <section className="panel" id="network-trust-368" aria-label="Network trust and device identity">
      <p className="eyebrow">Build 368 · Local private network security</p>
      <h2>Private network trust &amp; device identity</h2>
      <p>Review owner-entered private addresses and the exact source that claimed them.
        This is not live network discovery, a verified device connection, pairing,
        permission to control equipment, or a router/firewall rule.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>Refresh private registry</button>
      {failure && <p role="alert" className="auth-error">{failure}</p>}
      {result && <p role="status">{result}</p>}
      {state ? (
        <>
          <p role="status">
            {state.scopes.filter((scope) => scope.active).length} signed active scope(s) ·
            {" "}{state.devices.length} manually recorded identity(s) · scan OFF
          </p>
          <details>
            <summary>Owner-signed network segment approval</summary>
            <p>First sign one bounded RFC1918 CIDR (/24 or smaller) using the offline
              <code> scripts/sign-network-scope368.py</code> helper and an independently
              protected Ed25519 owner key. Paste only its signed JSON receipt here.
              Key and private address details must never be posted in GitHub.</p>
            <label htmlFor="network368-signed-scope">Signed scope receipt (JSON)</label>
            <textarea id="network368-signed-scope" rows={4} value={approval}
              onChange={(event) => setApproval(event.target.value)}
              placeholder='{"cidr":"192.168.1.0/24", "...":"..."}' />
            <button type="button" disabled={busy || !approval.trim()}
              onClick={() => void action(() => approveNetworkScope368(
                JSON.parse(approval) as NetworkTrust368Scope
              ), "Owner-signed segment stored; no network probe was run.")}>
              Verify signature and store scope
            </button>
          </details>
          <h3>Approved segments</h3>
          {state.scopes.length ? (
            <ul>{state.scopes.map((scope) => (
              <li key={scope.id}>
                <strong>{scope.label}</strong> ({scope.cidr}) ·
                {scope.active ? "active approval" : "expired / hold"} ·
                revision {scope.revision} · expires {new Date(scope.expiryMs).toLocaleString()}
              </li>
            ))}</ul>
          ) : <p>No independently signed scopes are stored. Addresses cannot be recorded.</p>}
          <form onSubmit={(event) => {
            event.preventDefault();
            void action(() => recordNetworkClaim368({
              source, source_id: sourceId.trim(), ip: ip.trim(), lease_ref: leaseRef.trim(),
            }), "Manual observation saved as unverified, without scanning or adopting a device.");
          }}>
            <h3>Record one manually observed device and IP</h3>
            <p>Use a non-secret source ID. IP addresses and lease hints are private owner-only data;
              the claim remains unverified until independently checked.</p>
            <label htmlFor="network368-source">Evidence source</label>
            <select id="network368-source" value={source}
              onChange={(event) => setSource(event.target.value as typeof source)}>
              <option value="manual">Manual note</option>
              <option value="ha_device">Home Assistant device ID</option>
              <option value="ha_entity">Home Assistant entity ID</option>
              <option value="camera">Camera reference</option>
              <option value="mqtt">Exact MQTT reference</option>
            </select>
            <label htmlFor="network368-id">Exact device reference</label>
            <input id="network368-id" maxLength={120} required value={sourceId}
              onChange={(event) => setSourceId(event.target.value)} />
            <label htmlFor="network368-ip">Approved private IPv4 address</label>
            <input id="network368-ip" maxLength={15} required value={ip}
              onChange={(event) => setIp(event.target.value)} placeholder="192.168.1.25" />
            <label htmlFor="network368-lease">Optional lease note (not MAC or credentials)</label>
            <input id="network368-lease" maxLength={40} value={leaseRef}
              onChange={(event) => setLeaseRef(event.target.value)} />
            <button type="submit" disabled={busy || !state.scopes.some((scope) => scope.active)}>
              Record unverified observation
            </button>
          </form>
          <h3>Identities and private IP history</h3>
          {state.devices.length ? state.devices.map((device) => (
            <article className="panel" key={device.id}>
              <h4>{device.source}: {device.sourceId}</h4>
              <p>Review state: <strong>{device.decision}</strong>. This does not alter
                network access. {device.riskFlags.length
                  ? `Warnings: ${device.riskFlags.join(", ")}`
                  : "No detected identity or IP history warnings."}</p>
              <ul>{device.history.slice(0, 10).map((entry, index) => (
                <li key={index}>{entry.ip} · {new Date(entry.observedAt).toLocaleString()}
                  {entry.leaseRef ? ` · ${entry.leaseRef}` : ""} · unverified claim</li>
              ))}</ul>
              {(["needs_review", "trusted", "monitor", "blocked"] as const).map((decision) => (
                <button type="button" key={decision} disabled={busy || decision === device.decision
                  || (decision === "trusted" && device.riskFlags.length > 0)}
                onClick={() => void action(() => decideNetworkIdentity368(
                  device.id, decision, device.revision
                ), `Review set to ${decision}; no physical/network change.`)}>
                  {decision.replace("_", " ")}
                </button>
              ))}
            </article>
          )) : <p>No device identities recorded; not evidence that the LAN is empty.</p>}
        </>
      ) : <p role="status">Owner-only data is unavailable or not yet loaded.</p>}
    </section>
  );
}
