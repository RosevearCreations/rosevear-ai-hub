import { useCallback, useEffect, useRef, useState } from "react";
import {
  createITTicket385, getITDiagnostics385, getITTickets385, transitionITTicket385,
} from "./api";

type Process385 = {
  processName: string;
  observedNameCount: number;
  oldestObservedUptimeSeconds: number | null;
  identityAndRoleVerified: false;
  restartCountMeasured: null;
  state: string;
};

type Runtime385 = {
  schema: string;
  status: string;
  osBootTimeMs: number | null;
  osBootIndependentlyWitnessed: false;
  hubApiUptimeSeconds: number | null;
  hubApiRoleVerified: boolean;
  restartHistoryIndependentlyVerified: false;
  processNames: Process385[];
  lan: {
    interfaceCount: number | null;
    reportedUpCount: number | null;
    totalBytesSentSinceOsCountersReset: number | null;
    totalBytesReceivedSinceOsCountersReset: number | null;
    internetReachabilityVerified: false;
    gatewayReachabilityVerified: false;
    lanHealthyIndependentlyVerified: false;
  };
  resourceBudget: {
    status: string;
    signals: string[];
    host_memory: { available_bytes: number };
    workspace_volume: { free_bytes: number };
  } | null;
  alerts: { code: string; severity: string; evidence: string }[];
  liveThreeMasterDeliveryVerified: false;
  automaticRepairAuthorized: false;
  webCanRestartServices: false;
};

type Ticket385 = {
  id: string;
  appId: string;
  category: string;
  summaryCode: string;
  openedAtMs: number;
  targetAtMs: number;
  updatedAtMs: number;
  closedAtMs: number | null;
  status: "open" | "investigating" | "waiting" | "resolved";
  revision: number;
  ownerTargetOverdue: boolean;
  slaVerified: false;
  events: {
    revision: number;
    occurredAtMs: number;
    action: string;
    evidenceKind: string;
    evidenceHashPresent: boolean;
    authority: string;
  }[];
};

type Tickets385 = {
  schema: string;
  status: string;
  tickets: Ticket385[];
  ticketCount: number;
  openOrPendingCount: number;
  targetOverdueCount: number;
  slaCertifiedCount: 0;
  providerComplaintResolutionVerified: false;
  serviceActuationAuthorized: false;
};

const APPS = [
  "ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
  "yw", "icamp", "rosiedazzlers", "devilndove",
] as const;
const CATEGORIES = ["incident", "complaint", "support", "maintenance"] as const;
const SUMMARIES = [
  "SERVICE_UNAVAILABLE", "LATENCY_SLOW", "PROCESS_RESTART_REPORTED",
  "LAN_ISSUE_REPORTED", "SUPPORT_REQUEST", "COMPLAINT",
  "RECOVERY_EVIDENCE_REVIEW", "OTHER",
] as const;
const TARGETS = [4, 24, 72, 168] as const;
const TRANSITIONS: Record<Ticket385["status"], Ticket385["status"][]> = {
  open: ["investigating", "waiting", "resolved"],
  investigating: ["waiting", "resolved"],
  waiting: ["investigating", "resolved"],
  resolved: ["open"],
};

export function trustedRuntime385(raw: unknown): raw is Runtime385 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const v = raw as Record<string, unknown>;
  return v.schema === "rosevear.hub.it-operations385.v1" &&
    typeof v.status === "string" &&
    v.osBootIndependentlyWitnessed === false &&
    v.restartHistoryIndependentlyVerified === false &&
    v.liveThreeMasterDeliveryVerified === false &&
    v.automaticRepairAuthorized === false &&
    v.webCanRestartServices === false &&
    (v.hubApiUptimeSeconds === null || typeof v.hubApiUptimeSeconds === "number") &&
    Array.isArray(v.processNames) && v.processNames.length <= 5 &&
    v.processNames.every((p: Record<string, unknown>) =>
      typeof p.processName === "string" && typeof p.observedNameCount === "number" &&
      p.identityAndRoleVerified === false && p.restartCountMeasured === null) &&
    typeof v.lan === "object" && v.lan !== null &&
    (v.lan as Record<string, unknown>).internetReachabilityVerified === false &&
    (v.lan as Record<string, unknown>).gatewayReachabilityVerified === false &&
    (v.lan as Record<string, unknown>).lanHealthyIndependentlyVerified === false &&
    Array.isArray(v.alerts);
}

export function trustedTickets385(raw: unknown): raw is Tickets385 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const v = raw as Record<string, unknown>;
  return v.schema === "rosevear.hub.service-desk385.v1" &&
    typeof v.status === "string" &&
    v.slaCertifiedCount === 0 &&
    v.providerComplaintResolutionVerified === false &&
    v.serviceActuationAuthorized === false &&
    typeof v.ticketCount === "number" && v.ticketCount >= 0 && v.ticketCount <= 500 &&
    typeof v.targetOverdueCount === "number" &&
    Array.isArray(v.tickets) && v.tickets.length <= 500 &&
    v.tickets.every((t: Record<string, unknown>) =>
      APPS.includes(t.appId as typeof APPS[number]) &&
      CATEGORIES.includes(t.category as typeof CATEGORIES[number]) &&
      typeof t.id === "string" && typeof t.revision === "number" &&
      typeof t.summaryCode === "string" &&
      typeof t.ownerTargetOverdue === "boolean" &&
      t.slaVerified === false && Array.isArray(t.events) && t.events.length <= 24);
}

function time385(ms: number | null | undefined): string {
  return ms === null || ms === undefined ? "Not witnessed" : new Date(ms).toLocaleString();
}
function count385(value: number | null | undefined): string {
  return value === null || value === undefined ? "Unmeasured" : value.toLocaleString();
}

export function ITServiceDesk385Panel() {
  const [runtime, setRuntime] = useState<Runtime385 | null>(null);
  const [tickets, setTickets] = useState<Tickets385 | null>(null);
  const [message, setMessage] = useState("IT operations not yet reviewed.");
  const [busy, setBusy] = useState(false);
  const [app, setApp] = useState<string>("rosevear-ai-hub");
  const [category, setCategory] = useState<string>("incident");
  const [summary, setSummary] = useState<string>("SERVICE_UNAVAILABLE");
  const [target, setTarget] = useState<number>(24);
  const [transitions, setTransitions] = useState<Record<string, string>>({});
  const abort = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abort.current?.abort();
    const current = new AbortController();
    abort.current = current;
    setBusy(true);
    const [health, desk] = await Promise.allSettled([
      getITDiagnostics385(current.signal), getITTickets385(current.signal),
    ]);
    if (abort.current !== current) return;
    setRuntime(health.status === "fulfilled" && trustedRuntime385(health.value) ? health.value : null);
    setTickets(desk.status === "fulfilled" && trustedTickets385(desk.value) ? desk.value : null);
    setMessage(health.status === "fulfilled" && desk.status === "fulfilled"
      ? "Local IT diagnostics and owner reports reviewed (not independent field acceptance)."
      : "HOLD: one or more original-host private endpoints are unavailable.");
    setBusy(false);
  }, []);

  useEffect(() => {
    void refresh();
    return () => abort.current?.abort();
  }, [refresh]);

  const create = async () => {
    if (busy || !APPS.includes(app as typeof APPS[number]) ||
        !CATEGORIES.includes(category as typeof CATEGORIES[number]) ||
        !SUMMARIES.includes(summary as typeof SUMMARIES[number]) ||
        !TARGETS.includes(target as typeof TARGETS[number])) return;
    setBusy(true);
    try {
      await createITTicket385({
        app_id: app, category, summary_code: summary, target_hours: target,
        evidence_kind: "OWNER_REPORT_UNVERIFIED",
      });
      setMessage("Owner ticket recorded; source report is not independent proof.");
      await refresh();
    } catch {
      setMessage("HOLD: ticket not recorded. Check original Windows host and private DB.");
      setBusy(false);
    }
  };
  const transition = async (ticket: Ticket385) => {
    const next = transitions[ticket.id];
    if (busy || !TRANSITIONS[ticket.status].includes(next as Ticket385["status"])) return;
    setBusy(true);
    try {
      await transitionITTicket385(ticket.id, {
        expected_revision: ticket.revision,
        status: next, evidence_kind: "OWNER_REPORT_UNVERIFIED",
      });
      setMessage("Owner-only transition recorded; external SLA/recovery remains unverified.");
      await refresh();
    } catch {
      setMessage("HOLD: revision conflict or private journal unavailable; refresh before retry.");
      setBusy(false);
    }
  };

  return <section id="hub-it-service-desk385" className="mc-panel shell349"
    aria-label="Private IT service desk and measured local diagnostics">
    <div className="shell349-toolbar">
      <div>
        <h2>IT service desk &amp; performance · Build 385</h2>
        <p>Original Windows host only; on-demand unsigned runtime counters,
          private structured owner complaints, revisions and planning targets.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reviewing…" : "Refresh local evidence"}
      </button>
    </div>
    <p role="status">{message}</p>
    <p>Runtime: <strong>{runtime?.status ?? "HOLD_UNVERIFIED"}</strong></p>
    <div className="shell349-status-grid">
      <article className="shell349-status">
        <strong>Hub API process uptime</strong>
        <p>{count385(runtime?.hubApiUptimeSeconds)} seconds</p>
        <small>Process-local only; reboot/restart history unverified.</small>
      </article>
      <article className="shell349-status">
        <strong>Local OS boot reported</strong>
        <p>{time385(runtime?.osBootTimeMs)}</p>
        <small>No independent physical reboot witness.</small>
      </article>
      <article className="shell349-status">
        <strong>LAN interface counters</strong>
        <p>Up: {count385(runtime?.lan.reportedUpCount)}
          {" / total: "}{count385(runtime?.lan.interfaceCount)}</p>
        <small>No gateway, Internet, or cross-device connectivity test.</small>
      </article>
      <article className="shell349-status">
        <strong>Local resource budget</strong>
        <p>{runtime?.resourceBudget?.status ?? "Unmeasured"}</p>
        <small>{(runtime?.resourceBudget?.signals ?? []).join(", ") || "No reported local threshold flags"}</small>
      </article>
    </div>
    <h3>Observed process names — identity not attested</h3>
    <div className="shell349-status-grid">
      {runtime?.processNames.map(p => <article className="shell349-status" key={p.processName}>
        <strong>{p.processName}</strong>
        <p>OS processes with name: {p.observedNameCount}</p>
        <small>Oldest observed age: {count385(p.oldestObservedUptimeSeconds)} seconds.
          Name match is not service identity, recovery certification or guaranteed availability.</small>
      </article>)}
    </div>
    <h3>Advisory diagnostics</h3>
    {(runtime?.alerts.length ?? 0) === 0
      ? <p>No local threshold warnings sampled, or host evidence unavailable. Not a health certificate.</p>
      : runtime?.alerts.map(a => <p key={a.code}>{a.code} · {a.severity} · {a.evidence}</p>)}
    <h3>Open an owner service request</h3>
    <div className="shell349-status-grid">
      <label>Application
        <select value={app} onChange={e => setApp(e.target.value)}>
          {APPS.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label>Request type
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label>Issue classification
        <select value={summary} onChange={e => setSummary(e.target.value)}>
          {SUMMARIES.map(x => <option key={x} value={x}>{x.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <label>Owner planning target (hours)
        <select value={target} onChange={e => setTarget(Number(e.target.value))}>
          {TARGETS.map(x => <option key={x} value={x}>{x} hours</option>)}
        </select>
      </label>
    </div>
    <button type="button" disabled={busy || !tickets ||
        tickets.status !== "PRIVATE_OWNER_TICKETS_NOT_PROVIDER_SLA"}
      onClick={() => void create()}>Record owner ticket</button>
    <p>No free-form secrets, customer identifiers or confidential notes are collected.
      The selected target is not a provider SLA or warranty.</p>
    <h3>Private service requests &amp; evidence timeline</h3>
    <p>Status: <strong>{tickets?.status ?? "HOLD_UNAVAILABLE"}</strong>
      {" · "}Owner reports: {tickets?.ticketCount ?? 0}
      {" · "}Pending: {tickets?.openOrPendingCount ?? 0}
      {" · "}Over owner-defined target: {tickets?.targetOverdueCount ?? 0}
      {" · "}Verified provider SLA closures: 0</p>
    <div className="shell349-status-grid">
      {tickets?.tickets.map(t => <article key={t.id} className="shell349-status">
        <strong>{t.appId} · {t.category}</strong>
        <p>{t.summaryCode.replaceAll("_", " ")} · {t.status}</p>
        <small>Opened {time385(t.openedAtMs)} · Planning target {time385(t.targetAtMs)}</small>
        <p>{t.ownerTargetOverdue ? "Owner target exceeded — review" : "No current owner-target overdue flag"}</p>
        <small>Revision {t.revision}; provider certification: NOT VERIFIED</small>
        <label>Owner follow-up action
          <select value={transitions[t.id] ?? ""} onChange={e =>
            setTransitions(prev => ({ ...prev, [t.id]: e.target.value }))}>
            <option value="">Choose an action</option>
            {TRANSITIONS[t.status].map(state =>
              <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy || !transitions[t.id]}
          onClick={() => void transition(t)}>Record follow-up</button>
        <details>
          <summary>Owner evidence history ({t.events.length} recent entries)</summary>
          {t.events.map(e => <p key={e.revision}>
            Rev {e.revision}: {e.action} · {time385(e.occurredAtMs)}
            {" · "}{e.evidenceKind} · {e.authority}
          </p>)}
        </details>
      </article>)}
    </div>
    <p>All service actions remain manual. No restart, process kill, network scan,
      outbound complaint submission or private Comms receiver activation is provided here.</p>
  </section>;
}
