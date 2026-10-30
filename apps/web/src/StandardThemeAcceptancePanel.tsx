import { useState } from "react";
import type { ShellDensity, ShellTheme } from "./CommandShell";

const REVIEW_AREAS = [
  { id: "front_end", title: "Front end & navigation", detail: "Home, module navigation, sign-in and small-screen readability" },
  { id: "it", title: "I.T. & connections", detail: "Comms proof screens, safe controls and clear HOLD status" },
  { id: "management", title: "Management workspaces", detail: "Business tools, user administration and actions" },
  { id: "statistics", title: "Statistics & reports", detail: "Information density, tables, trends and audit readback" },
  { id: "status", title: "System status & alerts", detail: "Service health, warnings, contrast and provenance labels" }
] as const;
type Area = (typeof REVIEW_AREAS)[number]["id"];
type Finding = "not_checked" | "acceptable" | "needs_change";
const INITIAL: Record<Area, Finding> = {
  front_end: "not_checked", it: "not_checked", management: "not_checked",
  statistics: "not_checked", status: "not_checked"
};

/** A session-scoped owner visual checklist, NEVER an integration release decision. */
export function StandardThemeAcceptancePanel({
  role, appearance, density
}: { role: "owner" | "administrator"; appearance: ShellTheme; density: ShellDensity }) {
  const [findings, setFindings] = useState<Record<Area, Finding>>({ ...INITIAL });
  const [handoff, setHandoff] = useState("");
  const isOwner = role === "owner";
  const done = REVIEW_AREAS.filter(area => findings[area.id] !== "not_checked").length;
  const changesNeeded = REVIEW_AREAS.filter(area => findings[area.id] === "needs_change").length;
  const result = done < REVIEW_AREAS.length ? "INCOMPLETE_OWNER_SCREEN_REVIEW" :
    changesNeeded > 0 ? "CHANGES_REQUESTED_IN_LOCAL_REVIEW" : "ALL_AREAS_MARKED_ACCEPTABLE_LOCALLY";

  function makeHandoff() {
    if (!isOwner) return;
    setHandoff(JSON.stringify({
      schema: "rosevear.build194.standard-theme-session-review.v1",
      scope: "VISUAL_FEEDBACK_ONLY_NOT_INDEPENDENT_OWNER_SIGNATURE",
      theme: appearance, density,
      reviewedAreas: done, totalAreas: REVIEW_AREAS.length, changesNeeded,
      result,
      findings: REVIEW_AREAS.map(area => ({ area: area.id, finding: findings[area.id] })),
      savedToBackend: false,
      independentlyWitnessedOwnerAcceptance: "NOT_VERIFIED",
      integrationTestAuthorization: "NOT_GIVEN",
      authenticatedGatewayGets: 0,
      privateRelay: "OFF",
      integration: "DISCONNECTED / HOLD"
    }, null, 2));
  }

  return <section className="panel hub-theme-review" aria-labelledby="theme-owner-acceptance-title">
    <div className="hub-evidence-title">
      <div><p className="eyebrow">Build 194 · Standard theme owner walkthrough</p><h2 id="theme-owner-acceptance-title">Standard Theme Owner Acceptance</h2></div>
      <span className="hub-guard-badge">{done}/{REVIEW_AREAS.length} screens reviewed</span>
    </div>
    <p>Review the <strong>actual application screens</strong> with our new midnight Standard theme. Mark each area only after viewing it. This checklist stays in this browser session, contains no screenshots or private device data, and cannot authorize connections.</p>
    <p><strong>Current view:</strong> {appearance === "standard" ? "Standard (midnight)" : "High contrast"} · {density} density. Change these in the sidebar to check readability before recording findings.</p>
    {!isOwner && <p role="note">Administrator view only. A signed owner acceptance cannot be inferred from an administrator session.</p>}
    <div className="hub-theme-review-grid">
      {REVIEW_AREAS.map(area => <div className="hub-theme-review-card" key={area.id}>
        <div><strong>{area.title}</strong><small>{area.detail}</small></div>
        <label htmlFor={`theme-review-${area.id}`}>Review finding</label>
        <select id={`theme-review-${area.id}`} value={findings[area.id]} disabled={!isOwner}
          onChange={event => {
            setFindings(current => ({ ...current, [area.id]: event.target.value as Finding }));
            setHandoff("");
          }}>
          <option value="not_checked">Not checked</option>
          <option value="acceptable">Looks acceptable</option>
          <option value="needs_change">Needs a change</option>
        </select>
      </div>)}
    </div>
    <p><strong>Visual review status:</strong> <span aria-label="Standard theme owner review status">{result}</span>. {changesNeeded > 0 ? `${changesNeeded} area(s) need attention.` : "No issues marked so far."}</p>
    <div className="hub-connection-actions">
      <button type="button" disabled={!isOwner} onClick={makeHandoff}>Prepare local visual-review report</button>
      <button type="button" disabled={!isOwner} onClick={() => { setFindings({ ...INITIAL }); setHandoff(""); }}>Reset this session's review</button>
    </div>
    <pre aria-label="Build 194 sanitized Standard theme review report">{handoff || "No owner visual-review report prepared. External pilot authorization is unrelated and remains HELD."}</pre>
  </section>;
}
