import { useEffect, useMemo, useState } from "react";

import {
  captureHomeInventory369, getHomeInventory369, reviewHomeIdentity369,
  type AuthRole, type HomeInventory369Report,
} from "./api";

type ReviewDecision = "unclaimed" | "claimed" | "investigate" | "unsupported";
const reviewDecisions: ReviewDecision[] = ["claimed", "investigate", "unsupported", "unclaimed"];

/** One owner-initiated HA snapshot, not a LAN scan or a physical-device verifier. */
export function HomeInventory369({ role }: { role: AuthRole }) {
  const [report, setReport] = useState<HomeInventory369Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  async function load() {
    try {
      setReport(await getHomeInventory369());
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inventory unavailable.");
    }
  }

  useEffect(() => {
    if (role === "owner") void load();
  }, [role]);

  async function action(operation: () => Promise<HomeInventory369Report>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setReport(await operation());
      setNotice(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review was not saved.");
    } finally {
      setBusy(false);
    }
  }

  const entries = useMemo(() => (report?.identities ?? []).filter((item) => {
    const needle = search.trim().toLowerCase();
    const searchable = [item.name, item.sourceId, item.source, item.areaId, item.presence]
      .join(" ").toLowerCase();
    if (needle && !searchable.includes(needle)) return false;
    if (filter === "unclaimed") return item.claim === "unclaimed";
    if (filter === "missing") return item.presence === "missing_from_registry";
    if (filter === "unavailable") return item.presence === "unavailable";
    if (filter === "duplicates") return item.possibleNameDuplicate;
    if (filter === "mqtt") return item.source === "mqtt";
    return true;
  }), [report, search, filter]);

  if (role !== "owner") return null;

  return (
    <section className="panel" id="home-inventory369"
      aria-label="Whole-home Home Assistant inventory reconciliation">
      <header className="device-registry-heading">
        <div>
          <p className="eyebrow">Build 369 · Owner-reviewed household inventory</p>
          <h2>Whole-home inventory reconciliation</h2>
          <p>Capture the actual Home Assistant area, device, entity and state registries
            on demand, alongside existing reviewed MQTT topic notes. Check missing
            source IDs, renamed items, unassigned rooms and duplicate candidates.</p>
        </div>
        <button type="button" disabled={busy}
          onClick={() => void action(captureHomeInventory369,
            "A read-only Home Assistant snapshot was saved for review.")}>
          {busy ? "Checking Home Assistant…" : "Capture current HA inventory"}
        </button>
      </header>
      <p>Each entry is a <strong>source reference</strong>, not a separately verified
        physical device. No new scanning, MQTT subscriptions, pairing, network
        changes, machinery commands, or Home Assistant writes are performed.</p>
      {error && <p role="alert" className="auth-error">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!report ? <p role="status">Owner-only inventory report not loaded.</p> : (
        <>
          <p role="status">
            {report.lastCapture
              ? `Last saved source snapshot: ${new Date(report.lastCapture.capturedAt)
                  .toLocaleString()} (not continuously monitored)`
              : "No actual Home Assistant snapshot captured yet."}
          </p>
          <div className="dashboard-grid" aria-label="Inventory source counts">
            <article className="panel"><h3>Devices</h3>
              <p>{report.lastCapture?.deviceCount ?? "Unverified"}</p></article>
            <article className="panel"><h3>Entities</h3>
              <p>{report.lastCapture?.entityCount ?? "Unverified"}</p></article>
            <article className="panel"><h3>Areas</h3>
              <p>{report.lastCapture?.areaCount ?? "Unverified"}</p></article>
            <article className="panel"><h3>MQTT review notes</h3>
              <p>{report.lastCapture?.mqttReferenceCount ?? "Unverified"}</p></article>
            <article className="panel"><h3>Unclaimed</h3>
              <p>{report.counts.unclaimed}</p></article>
            <article className="panel"><h3>Not in HA registry</h3>
              <p>{report.counts.missing}</p></article>
            <article className="panel"><h3>Unavailable</h3>
              <p>{report.counts.unavailable}</p></article>
            <article className="panel"><h3>Possible name duplicates</h3>
              <p>{report.counts.duplicateCandidates}</p></article>
          </div>
          <div className="device-registry-filters">
            <label>Find device, entity, room or MQTT reference
              <input value={search} maxLength={120} onChange={(event) =>
                setSearch(event.target.value)} placeholder="Kitchen, Workshop…" />
            </label>
            <label>Review queue
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All source references</option>
                <option value="unclaimed">Not yet claimed</option>
                <option value="missing">Absent from saved HA reading</option>
                <option value="unavailable">Unavailable state</option>
                <option value="duplicates">Potential duplicate names</option>
                <option value="mqtt">Reviewed MQTT topic notes</option>
              </select>
            </label>
          </div>
          <p>{entries.length} of {report.identities.length} recorded source references.</p>
          {entries.length === 0 ? (
            <p>No matching references. This never proves that the house has no devices.</p>
          ) : (
            <div className="device-registry-results" role="region"
              aria-label="Reconciled Home Assistant identities">
              {entries.slice(0, 200).map((item) => (
                <article className="panel" key={item.id}>
                  <h3>{item.name}</h3>
                  <p><code>{item.source}: {item.sourceId}</code></p>
                  <p>Room/area: {item.areaId || "Unassigned"} ·
                    Source status: <strong>{item.presence.replaceAll("_", " ")}</strong>
                    {item.possibleNameDuplicate ? " · Potential name duplicate" : ""}
                  </p>
                  {item.relatedDeviceId && <p>HA parent: <code>{item.relatedDeviceId}</code></p>}
                  <p>Last found in HA registry: {item.lastSourceSeenAt
                    ? new Date(item.lastSourceSeenAt).toLocaleString()
                    : "No HA presence evidence (manual note)"}</p>
                  <p>Review: {item.claim} · revision {item.revision}</p>
                  <div className="device-registry-match-actions">
                    {reviewDecisions.map((decision) => (
                      <button type="button" key={decision}
                        disabled={busy || item.claim === decision
                          || (decision === "claimed" &&
                            item.presence === "missing_from_registry")}
                        onClick={() => void action(
                          () => reviewHomeIdentity369(item.id, decision, item.revision),
                          `Owner review set to ${decision}; no provider device changed.`)}>
                        {decision.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
              {entries.length > 200 && <p>Showing 200 records. Narrow the search to
                locate the remaining entries.</p>}
            </div>
          )}
          <details>
            <summary>Recent rename, room and missing-reference changes</summary>
            {report.changes.length ? <ul>{report.changes.slice(0, 40).map(
              (entry, index) => (
                <li key={index}>
                  <strong>{entry.kind.replaceAll("_", " ")}</strong> ·
                  {" "}{entry.source}: {entry.sourceId}
                  {" "}({entry.before || "none"} → {entry.after || "none"})
                  {" "}· {new Date(entry.capturedAt).toLocaleString()}
                </li>
              )
            )}</ul> : <p>Nothing captured yet.</p>}
          </details>
          <small>Recorded source presence, owner claims and duplicate suggestions are
            not physical-device verification. An offline or incomplete HA read
            leaves the previous snapshot intact and must not count as a deletion.</small>
        </>
      )}
    </section>
  );
}
