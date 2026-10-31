import { useState } from "react";
import type { ShellDensity, ShellTheme } from "./CommandShell";

const REVIEW_AREAS = [
  { id: "front_end", title: "Front end & navigation", detail: "Home, module navigation, sign-in and small-screen readability", target: "Home" },
  { id: "it", title: "I.T. & connections", detail: "Comms proof screens, safe controls and clear HOLD status", target: "System" },
  { id: "management", title: "Management workspaces", detail: "Business tools, user administration and actions", target: "Business" },
  { id: "statistics", title: "Statistics & reports", detail: "Information density, tables, trends and audit readback", target: "Audit" },
  { id: "status", title: "System status & alerts", detail: "Service health, warnings, contrast and provenance labels", target: "System" }
] as const;
type Area = (typeof REVIEW_AREAS)[number]["id"];
type Finding = "not_checked" | "acceptable" | "needs_change";
type IssueCategory = "none" | "contrast" | "layout" | "navigation" | "labels" | "functionality";
type Followup = "none" | "open" | "follow_up_requested" | "local_retest_recorded";
const INITIAL: Record<Area, Finding> = {
  front_end: "not_checked", it: "not_checked", management: "not_checked",
  statistics: "not_checked", status: "not_checked"
};
const INITIAL_ISSUES: Record<Area, IssueCategory> = {
  front_end: "none", it: "none", management: "none", statistics: "none", status: "none"
};
const INITIAL_FOLLOWUPS: Record<Area, Followup> = {
  front_end: "none", it: "none", management: "none", statistics: "none", status: "none"
};

/** A session-scoped owner visual checklist, NEVER an integration release decision. */
export function StandardThemeAcceptancePanel({
  role, appearance, density, onNavigate
}: { role: "owner" | "administrator"; appearance: ShellTheme; density: ShellDensity;
  onNavigate?: (target: "Home" | "System" | "Business" | "Audit") => void }) {
  const [findings, setFindings] = useState<Record<Area, Finding>>({ ...INITIAL });
  const [issues, setIssues] = useState<Record<Area, IssueCategory>>({ ...INITIAL_ISSUES });
  const [followups, setFollowups] = useState<Record<Area, Followup>>({ ...INITIAL_FOLLOWUPS });
  const [handoff, setHandoff] = useState("");
  const isOwner = role === "owner";
  const done = REVIEW_AREAS.filter(area => findings[area.id] !== "not_checked").length;
  const changesNeeded = REVIEW_AREAS.filter(area => findings[area.id] === "needs_change").length;
  const result = done < REVIEW_AREAS.length ? "INCOMPLETE_OWNER_SCREEN_REVIEW" :
    changesNeeded > 0 ? "CHANGES_REQUESTED_IN_LOCAL_REVIEW" : "ALL_AREAS_MARKED_ACCEPTABLE_LOCALLY";

  function makeHandoff() {
    if (!isOwner) return;
    setHandoff(JSON.stringify({
      schema: "rosevear.build195.standard-theme-session-issue-review.v1",
      scope: "VISUAL_FEEDBACK_ONLY_NOT_INDEPENDENT_OWNER_SIGNATURE",
      theme: appearance, density,
      reviewedAreas: done, totalAreas: REVIEW_AREAS.length, changesNeeded,
      result,
      findings: REVIEW_AREAS.map(area => ({ area: area.id, finding: findings[area.id],
        issueCategory: findings[area.id] === "needs_change" ? issues[area.id] : "none",
        followup: findings[area.id] === "needs_change" ? followups[area.id] : "none" })),
      engineeringFixVerified: false,
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
      <div><p className="eyebrow">Build 195 · Standard theme real-screen walkthrough</p><h2 id="theme-owner-acceptance-title">Standard Theme Owner Acceptance</h2></div>
      <span className="hub-guard-badge">{done}/{REVIEW_AREAS.length} screens reviewed</span>
    </div>
    <p>Review the <strong>actual application screens</strong> with our new midnight Standard theme. Use each card's Open workspace shortcut; your findings now survive these in-app navigation changes. They remain only in this browser session and cannot authorize connections.</p>
    <p><strong>Current view:</strong> {appearance === "standard" ? "Standard (midnight)" : "High contrast"} · {density} density. Change these in the sidebar to check readability before recording findings.</p>
    {!isOwner && <p role="note">Administrator view only. A signed owner acceptance cannot be inferred from an administrator session.</p>}
    <div className="hub-theme-review-grid">
      {REVIEW_AREAS.map(area => <div className="hub-theme-review-card" key={area.id}>
        <div><strong>{area.title}</strong><small>{area.detail}</small></div>
        <button type="button" className="hub-workspace-shortcut" onClick={() => onNavigate?.(area.target)}
          disabled={!onNavigate} aria-label={`Open ${area.title} workspace for review`}>Open workspace →</button>
        <label htmlFor={`theme-review-${area.id}`}>Review finding</label>
        <select id={`theme-review-${area.id}`} value={findings[area.id]} disabled={!isOwner}
          onChange={event => {
            const next = event.target.value as Finding;
            setFindings(current => ({ ...current, [area.id]: next }));
            setIssues(current => ({ ...current, [area.id]: next === "needs_change" ? "layout" : "none" }));
            setFollowups(current => ({ ...current, [area.id]: next === "needs_change" ? "open" : "none" }));
            setHandoff("");
          }}>
          <option value="not_checked">Not checked</option>
          <option value="acceptable">Looks acceptable</option>
          <option value="needs_change">Needs a change</option>
        </select>
      </div>)}
    </div>
    <div className="hub-theme-issues" role="region" aria-label="Standard theme visual issue follow-up queue">
      <div className="hub-evidence-title"><h3>Screen issue follow-up</h3><span className="hub-guard-badge">{changesNeeded} open visual findings</span></div>
      {changesNeeded === 0 ? <p>No screens are marked as needing a change. This is a local review state, not independent acceptance.</p> :
        REVIEW_AREAS.filter(area => findings[area.id] === "needs_change").map(area =>
          <div className="hub-theme-issue" key={area.id}>
            <strong>{area.title}</strong>
            <label htmlFor={`theme-issue-${area.id}`}>Issue category</label>
            <select id={`theme-issue-${area.id}`} value={issues[area.id]} disabled={!isOwner}
              onChange={event => { setIssues(current => ({ ...current, [area.id]: event.target.value as IssueCategory })); setHandoff(""); }}>
              <option value="contrast">Contrast / colour</option><option value="layout">Layout / spacing</option>
              <option value="navigation">Navigation / workflow</option><option value="labels">Labels / readability</option>
              <option value="functionality">Control does not work</option>
            </select>
            <span>Follow-up: <strong>{followups[area.id].replaceAll("_", " ")}</strong></span>
            <button type="button" disabled={!isOwner} onClick={() => { setFollowups(current => ({ ...current, [area.id]: "follow_up_requested" })); setHandoff(""); }}>Request engineering follow-up</button>
            <button type="button" disabled={!isOwner || followups[area.id] !== "follow_up_requested"}
              onClick={() => { setFollowups(current => ({ ...current, [area.id]: "local_retest_recorded" })); setHandoff(""); }}>Record visual retest (not a code fix)</button>
          </div>)}
    </div>
    <p><strong>Visual review status:</strong> <span aria-label="Standard theme owner review status">{result}</span>. {changesNeeded > 0 ? `${changesNeeded} area(s) need attention.` : "No issues marked so far."}</p>
    <div className="hub-connection-actions">
      <button type="button" disabled={!isOwner} onClick={makeHandoff}>Prepare local visual-review report</button>
      <button type="button" disabled={!isOwner} onClick={() => { setFindings({ ...INITIAL }); setIssues({ ...INITIAL_ISSUES }); setFollowups({ ...INITIAL_FOLLOWUPS }); setHandoff(""); }}>Reset this session's review</button>
    </div>
    <pre aria-label="Build 194 sanitized Standard theme review report">{handoff || "No owner visual-review report prepared. External pilot authorization is unrelated and remains HELD."}</pre>
  </section>;
}
