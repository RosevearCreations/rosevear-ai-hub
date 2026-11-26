import { useState } from "react";
import { runtimeResilience391 } from "./api";

const masters = ["rosevear-ai-hub", "ai-data-platform", "rosevear-comms-hub"];
const priorities = ["ESCALATE_REVIEW", "EVIDENCE_UNAVAILABLE", "VERIFY_RECOVERY", "FRESHNESS_EXPIRING", "MONITOR"];
type Source = { source: string; priority: string; status: string; recommendedAction: string; evidenceFreshnessRemainingMs: number | null };
type History = { id: number; source: string; priority: string; status: string; recordedAtMs: number };
type Report = { sources: Source[]; temporalIncidentPairs: string[][]; history: History[]; escalationLedgerConfigured: boolean };

function parseReport(raw: unknown): Report {
  if (!raw || typeof raw !== "object") throw new Error("HOLD");
  const r = raw as Record<string, unknown>;
  if (r.sharedRootCauseVerified !== false || r.failureProbabilityEstimated !== false ||
      r.independentOperationalResilienceVerified !== false || r.recoveryExecutionAuthorized !== false ||
      r.receiverActivationAuthorized !== false || typeof r.escalationLedgerConfigured !== "boolean" ||
      !Array.isArray(r.sources) || r.sources.length !== 3 || !Array.isArray(r.temporalIncidentPairs) ||
      r.temporalIncidentPairs.length > 3 || !Array.isArray(r.history) || r.history.length > 100) throw new Error("HOLD");
  const seen = new Set<string>();
  for (const row of r.sources) {
    if (!row || typeof row.source !== "string" || !masters.includes(row.source) || seen.has(row.source) ||
        !priorities.includes(row.priority) || typeof row.status !== "string" || typeof row.recommendedAction !== "string" ||
        (row.evidenceFreshnessRemainingMs !== null && (!Number.isSafeInteger(row.evidenceFreshnessRemainingMs) ||
        row.evidenceFreshnessRemainingMs < 0 || row.evidenceFreshnessRemainingMs > 600000))) throw new Error("HOLD");
    seen.add(row.source);
  }
  for (const pair of r.temporalIncidentPairs) {
    if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] ||
        !pair.every(name => masters.includes(name))) throw new Error("HOLD");
  }
  for (const row of r.history) {
    if (!row || !Number.isSafeInteger(row.id) || row.id < 1 || !masters.includes(row.source) ||
        !priorities.includes(row.priority) || typeof row.status !== "string" ||
        !Number.isSafeInteger(row.recordedAtMs) || row.recordedAtMs < 0) throw new Error("HOLD");
  }
  return r as unknown as Report;
}

export function RuntimeResilience391Panel() {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Resilience evidence not yet checked.");
  async function run(action: "read" | "reconcile") {
    if (busy) return;
    setBusy(true);
    try {
      let recorded = "";
      if (action === "reconcile") {
        const result = await runtimeResilience391("reconcile");
        if (!result || typeof result !== "object") throw new Error("HOLD");
        const v = result as Record<string, unknown>;
        if (typeof v.recordedTransitions !== "number" || !Number.isSafeInteger(v.recordedTransitions) ||
            v.recordedTransitions < 0 || v.recordedTransitions > 3 || v.externalDeliveryVerified !== false) throw new Error("HOLD");
        recorded = String(v.recordedTransitions) + " local transitions recorded. ";
      }
      setReport(parseReport(await runtimeResilience391("read")));
      setMessage(recorded + "Advisory readback completed. External delivery and independent resilience remain unverified.");
    } catch {
      setReport(null);
      setMessage("HOLD: resilience evidence or escalation ledger unavailable.");
    } finally { setBusy(false); }
  }
  return <section aria-label="Build 391 infrastructure resilience">
    <h3>Infrastructure resilience and escalation · Build 391</h3>
    <p>Receipt-expiry forecasts and temporal incident correlations are advisory, not failure probabilities or shared-cause proof. No device commands are enabled.</p>
    <button type="button" disabled={busy} onClick={() => void run("read")}>Read infrastructure forecast</button>
    <button type="button" disabled={busy || !report?.escalationLedgerConfigured} onClick={() => void run("reconcile")}>Record escalation transitions</button>
    <p role="status" aria-label="Infrastructure resilience status">{message}</p>
    {report && <>
      {report.sources.map(row => <article key={row.source}>
        <h4>{row.source}</h4>
        <p>{row.priority} · {row.status}</p>
        <p>Evidence freshness remaining: {row.evidenceFreshnessRemainingMs === null ? "Unavailable" : Math.ceil(row.evidenceFreshnessRemainingMs / 1000) + " seconds"}</p>
        <p>{row.recommendedAction}</p>
      </article>)}
      <p>Correlated source pairs: {report.temporalIncidentPairs.length}</p>
      {report.temporalIncidentPairs.map(pair => <p key={pair.join(":")}>{pair.join(" / ")} — temporal overlap only</p>)}
      <h4>Local advisory escalation history</h4>
      {report.history.map(row => <p key={row.id}>{row.source} · {row.priority} · {row.status}</p>)}
    </>}
  </section>;
}
