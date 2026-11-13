import type { ReactNode } from "react";

/** QL-439 protected source-backed read-only instrument. No local runtime assertions. */
export interface Ql439ReadinessSnapshot {
  source: string;
  observedAt: string;
  incidentId: string;
  ceremonyId: string;
  episodeId: string;
  custody: "PENDING" | "READINESS" | "UNVERIFIED";
  connection: "HOLD";
  activationAuthorized: false;
  receiverObservation: "UNKNOWN" | "SIGNED_OFF_HISTORICAL";
  verifiedReceipts: ReadonlyArray<{
    id: string;
    label: string;
    digest: string;
    signer: string;
    observedAt: string;
  }>;
}

export function Ql439ReadOnlyInspector({
  snapshot,
  pending,
  error,
}: {
  snapshot?: Ql439ReadinessSnapshot | null;
  pending?: boolean;
  error?: string | null;
}): ReactNode {
  if (pending) return <section className="mc-panel" role="status">Loading protected evidence…</section>;
  if (error) return <section className="mc-panel" role="alert">Evidence unavailable: {error}</section>;
  if (!snapshot) return <section className="mc-panel" role="status">No authorized QL-439 evidence snapshot.</section>;

  // Reject unsafe/unexpected server states instead of silently rendering them as trusted.
  if (snapshot.connection !== "HOLD" || snapshot.activationAuthorized !== false ||
      !["PENDING", "READINESS", "UNVERIFIED"].includes(snapshot.custody) ||
      !["UNKNOWN", "SIGNED_OFF_HISTORICAL"].includes(snapshot.receiverObservation) ||
      !Array.isArray(snapshot.verifiedReceipts) ||
      ![snapshot.source, snapshot.observedAt, snapshot.incidentId,
        snapshot.ceremonyId, snapshot.episodeId].every(value =>
        typeof value === "string" && value.trim().length > 0) ||
      (snapshot.custody === "UNVERIFIED" &&
        snapshot.receiverObservation === "SIGNED_OFF_HISTORICAL")) {
    return <section className="mc-panel" role="alert">Evidence state inconsistent; remain on HOLD.</section>;
  }

  // Source claims are displayed as unverified references, never trusted signature results.
  const receipts = snapshot.verifiedReceipts.filter(item =>
    typeof item.id === "string" && typeof item.label === "string" &&
    typeof item.signer === "string" && typeof item.observedAt === "string" &&
    typeof item.digest === "string" && /^[0-9a-fA-F]{64}$/.test(item.digest)
  );
  return <section className="mc-panel" aria-label="QL-439 protected evidence inspector">
    <h3>Original-host readiness evidence</h3>
    <p className="mc-status" data-tone="warning">HOLD — preparation only, no activation authority</p>
    <dl className="mc-evidence-meta">
      <div><dt>Source</dt><dd>{snapshot.source}</dd></div>
      <div><dt>Observed at</dt><dd>{snapshot.observedAt}</dd></div>
      <div><dt>Incident</dt><dd>{snapshot.incidentId}</dd></div>
      <div><dt>Ceremony</dt><dd>{snapshot.ceremonyId}</dd></div>
      <div><dt>Episode</dt><dd>{snapshot.episodeId}</dd></div>
      <div><dt>Protected custody</dt><dd>{snapshot.custody}</dd></div>
      <div><dt>Receiver evidence</dt><dd>{snapshot.receiverObservation === "SIGNED_OFF_HISTORICAL"
        ? "Historical signed OFF only; live state unverified" : "Live OFF unverified"}</dd></div>
    </dl>
    <div className="mc-table-scroll" role="region" aria-label="Evidence receipts" tabIndex={0}>
      <table className="mc-evidence-table">
        <caption>Source-supplied signed receipt references (not independent verification)</caption>
        <thead><tr><th scope="col">Receipt</th><th scope="col">Digest</th>
          <th scope="col">Signer</th><th scope="col">Observed</th></tr></thead>
        <tbody>{receipts.map(item => <tr key={item.id}>
          <th scope="row">{item.label}</th><td><code>{item.digest}</code></td>
          <td>{item.signer}</td><td>{item.observedAt}</td>
        </tr>)}</tbody>
      </table>
      {receipts.length === 0 && <p role="status">No authorized receipts supplied.</p>}
    </div>
    <p className="mc-status" data-tone="warning">Private restart readback cannot prove current physical OFF.</p>
  </section>;
}
