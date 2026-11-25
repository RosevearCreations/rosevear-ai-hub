import { useCallback, useEffect, useRef, useState } from "react";
import { getHouseholdMasterCampaign387 } from "./api";
import { FieldCustody388Panel } from "./FieldCustody388Panel";
import { MasterAcceptance389Panel } from "./MasterAcceptance389Panel";
import {
  campaignDisposition387,
  emptyCampaignReports387,
  trustedCampaign387,
  updateCampaignReport387,
  type Campaign387,
  type CampaignStepId387,
  type OwnerObservation387,
} from "./campaign387";
import "./campaign387.css";

const OPTIONS387: { value: OwnerObservation387; label: string }[] = [
  { value: "not_checked", label: "Not checked" },
  { value: "owner_reports_observed", label: "Observed personally (not certified)" },
  { value: "owner_reports_issue", label: "Issue found — follow-up required" },
  { value: "unavailable", label: "Cannot check on this device" },
];

export function Campaign387Panel({ onNavigate }: {
  onNavigate: (section: string) => void;
}) {
  const [report, setReport] = useState<Campaign387 | null>(null);
  const [reports, setReports] = useState(emptyCampaignReports387);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("No original-host readback yet.");
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    try {
      const raw: unknown = await getHouseholdMasterCampaign387(controller.signal);
      if (controllerRef.current !== controller) return;
      if (!trustedCampaign387(raw)) {
        setReport(null);
        setMessage("HOLD_INVALID_CAMPAIGN_SOURCE_OR_UNAUTHORIZED_SUCCESS");
      } else {
        setReport(raw);
        setMessage(raw.runtimeSampleAvailable
          ? "Local Windows process context observed. Actual field acceptance remains HOLD."
          : "HOLD: original Windows runtime context missing or inaccessible.");
      }
    } catch {
      if (controllerRef.current === controller) {
        setReport(null);
        setMessage("HOLD: authenticated campaign API could not be read.");
      }
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => controllerRef.current?.abort();
  }, [refresh]);

  const disposition = campaignDisposition387(reports);
  const update = (id: CampaignStepId387, value: OwnerObservation387) =>
    setReports(current => updateCampaignReport387(current, id, value));

  return <section id="hub-campaign387" className="mc-panel campaign387"
    aria-label="Build 387 original household and three Master field acceptance campaign">
    <div className="campaign387-heading">
      <div>
        <p className="eyebrow">Build 387 · Source-only acceptance campaign</p>
        <h2>Household &amp; Three-Master acceptance campaign</h2>
        <p>A practical owner checklist tied to the live Hub sections.
          A local process count, green GitHub build, or our own report
          is <strong>not</strong> independent device, signed ACK, or backup proof.</p>
      </div>
      <button type="button" disabled={loading} onClick={() => void refresh()}>
        {loading ? "Checking…" : "Refresh original-host context"}
      </button>
    </div>
    <p role="status" aria-label="Original host campaign status">{message}</p>
    <div className="campaign387-stats">
      <div><strong>{disposition.ownerReviewed}/14</strong><span>Owner reports entered</span></div>
      <div><strong>{disposition.ownerReportedIssues}</strong><span>Issues reported</span></div>
      <div><strong>{disposition.ownerReportedUnavailable}</strong><span>Unavailable checks</span></div>
      <div><strong>0/14</strong><span>Field gates independently certified</span></div>
      <div><strong>0/24</strong><span>Hub modules field-certified</span></div>
    </div>
    <p><strong>Field verdict: HOLD</strong> · {disposition.status} ·
      reports are local to this browser session. No source report is a signed receipt,
      and refreshing evidence never executes an action or restarts a service.</p>
    <div className="campaign387-context">
      <p>Original Windows context: <strong>{report?.status ?? "HOLD_UNAVAILABLE"}</strong></p>
      <p>Locally observed API process age: {
        report?.apiProcessUptimeObservedSeconds === null ||
        report?.apiProcessUptimeObservedSeconds === undefined
          ? "unmeasured" : report.apiProcessUptimeObservedSeconds + " seconds"
      } (not reboot or uptime certification)</p>
      <p>OS-reported LAN interfaces up: {
        report?.localLanInterfacesReportedUp === null ||
        report?.localLanInterfacesReportedUp === undefined
          ? "unmeasured" : report.localLanInterfacesReportedUp
      } (not a network probe)</p>
      <p>Original Windows release folder must be established from Task Scheduler,
        the Git remote and original local-change preservation before pulling a new build.</p>
    </div>
    <h3>Live feature checks and independent witness requirements</h3>
    <p>Perform a step on the actual authorized hardware or account. Mark only
      what we personally observed, and keep independent evidence separate.
      If a step cannot be tested, mark it unavailable rather than inventing success.</p>
    <div className="campaign387-gates">
      {report?.gates.map((gate, i) => <article key={gate.id} className="campaign387-gate">
        <div className="campaign387-gateheading">
          <strong>{i + 1}. {gate.title}</strong>
          <span>FIELD HOLD</span>
        </div>
        <p>{gate.operatorProcedure}</p>
        <small>Independent evidence required: {gate.requiredIndependentEvidence.replaceAll("_", " ")}</small>
        <div className="campaign387-actions">
          <button type="button"
            disabled={gate.section === "System"}
            onClick={() => onNavigate(gate.section)}>
            {gate.section === "System" ? "Already in System" : "Open " + gate.section}
          </button>
          <label>Our local observation
            <select value={reports[gate.id]} onChange={e =>
              update(gate.id, e.target.value as OwnerObservation387)}>
              {OPTIONS387.map(option =>
                <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </article>)}
      {!report && <p>Acceptance steps cannot be asserted until a valid, owner-only
        source contract is loaded. No physical test has been certified.</p>}
    </div>
    <FieldCustody388Panel />
    <MasterAcceptance389Panel />
    <div className="campaign387-foot">
      <button type="button" onClick={() => setReports(emptyCampaignReports387())}>
        Clear session-only owner reports
      </button>
      <p>No secret input, browser storage, master receiver activation, automated device scanning,
        remote service control, destructive restore or unattended reboot is available here.
        Signed metadata can be reconciled below; independent physical evidence must still be reviewed separately.</p>
    </div>
  </section>;
}
