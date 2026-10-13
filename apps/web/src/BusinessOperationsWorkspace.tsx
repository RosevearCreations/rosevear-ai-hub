import type { BusinessConnectorRecord } from "./api";

export type ReadEvidence = {
  checkedAt: string;
  state: "verified" | "failed";
  recordCount?: number;
  hasMore?: boolean;
};

export type BusinessEvidenceLedger = Record<string, Record<string, ReadEvidence>>;

type Props = {
  connectors: BusinessConnectorRecord[];
  evidence: BusinessEvidenceLedger;
  checkedAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
};

function observedAt(iso: string) {
  return new Date(iso).toLocaleString();
}

export function BusinessOperationsWorkspace({
  connectors,
  evidence,
  checkedAt,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <section className="panel business-operations-workspace" aria-label="Business operations readiness">
      <div className="business-operations-heading">
        <div>
          <p className="eyebrow">Build 058 · Local-first operations</p>
          <h2>Connector readiness and read evidence</h2>
          <p className="small">
            Configuration is not proof that a business system is online. Each
            verified read below represents only the named resource and time.
          </p>
        </div>
        <button
          className="secondary"
          disabled={refreshing}
          onClick={onRefresh}
          type="button"
        >
          {refreshing ? "Checking readiness…" : "Refresh connector readiness"}
        </button>
      </div>
      <p className="small" role="status">
        {checkedAt
          ? `Connector configuration checked ${observedAt(checkedAt)}.`
          : "Connector configuration has not been checked."}
        {" "}Refresh checks local configuration, not remote service reachability.
      </p>
      <div className="business-operations-list">
        {connectors.map((connector) => {
          const reads = connector.capabilities.filter(
            (capability) => capability.access === "read_only",
          );
          const observations = evidence[connector.key] ?? {};
          const verifiedCount = Object.values(observations).filter(
            (item) => item.state === "verified",
          ).length;
          return (
            <article className="business-operations-item" key={connector.key}>
              <h3>{connector.display_name} readiness</h3>
              <p>
                <strong>Configuration:</strong>{" "}
                {connector.status.configured ? "Credentials configured" : "Needs setup in Secrets"}
              </p>
              <p className="small">
                {verifiedCount} of {reads.length} resources have successful
                reads in this page session. None are polled automatically.
              </p>
              <ul>
                {reads.map((capability) => {
                  const resource = capability.key.replace(/\.read$/, "");
                  const result = observations[resource];
                  return (
                    <li key={capability.key}>
                      <strong>{capability.label}:</strong>{" "}
                      {!result
                        ? "Not read in this session"
                        : result.state === "failed"
                          ? `Read failed at ${observedAt(result.checkedAt)}; not verified`
                          : `Read ${result.recordCount ?? 0} record(s) at ${observedAt(result.checkedAt)}${result.hasMore ? " (additional pages available)" : ""}`}
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
      <p className="small">
        Evidence is session-only metadata (resource, count, outcome, local
        observation time). No source records, client names, tokens, credentials
        or errors are saved to this ledger. Source record age is unknown.
        External writes still require exact approval and separate execution.
      </p>
    </section>
  );
}
