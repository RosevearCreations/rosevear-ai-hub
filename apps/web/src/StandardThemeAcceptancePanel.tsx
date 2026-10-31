import { useState } from "react";
import type { ShellDensity, ShellTheme } from "./CommandShell";
import { makeWindowsThemeRetestDisposition, type RetestOutcome } from "./windowsThemeRetest";
import { makeWindowsRetestFollowup, type FollowupStage } from "./windowsRetestFollowup";
import { makeWindowsOwnerRetestAudit, type WindowsRetestAuditItem } from "./windowsOwnerRetestAudit";
import { makeQl275OwnerFollowupReview } from "./ql275DeferredReview";

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
const DEVICE_CHECKS = [
  { id: "navigation", title: "Actual workspace navigation", detail: "Home, System, Business and Audit shortcuts reach the correct screen" },
  { id: "resize", title: "Window resizing & zoom", detail: "At narrow and enlarged browser sizes, controls and labels are readable" },
  { id: "keyboard", title: "Keyboard & visible focus", detail: "Use Tab, Enter and Escape; no essential action requires a mouse" },
  { id: "data", title: "Real data and empty/error states", detail: "Live status shows its source, with no invented healthy or connected counts" },
  { id: "refresh", title: "Reload and connectivity recovery", detail: "Record what happens after refreshing the page and reconnecting" }
] as const;
type DeviceCheck = (typeof DEVICE_CHECKS)[number]["id"];
type DeviceFinding = "not_checked" | "observed_pass" | "observed_fail";
type DeviceContext = "not_checked" | "windows_hub_server" | "remote_windows_client" | "other_browser_device";
const INITIAL_DEVICE: Record<DeviceCheck, DeviceFinding> = {
  navigation: "not_checked", resize: "not_checked", keyboard: "not_checked", data: "not_checked", refresh: "not_checked"
};
const INITIAL_RETEST: Record<DeviceCheck, RetestOutcome> = {
  navigation: "not_retested", resize: "not_retested", keyboard: "not_retested", data: "not_retested", refresh: "not_retested"
};
const INITIAL_RETEST_FOLLOWUP: Record<DeviceCheck, FollowupStage> = {
  navigation: "not_requested", resize: "not_requested", keyboard: "not_requested", data: "not_requested", refresh: "not_requested"
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
  const [deviceContext, setDeviceContext] = useState<DeviceContext>("not_checked");
  const [deviceFindings, setDeviceFindings] = useState<Record<DeviceCheck, DeviceFinding>>({ ...INITIAL_DEVICE });
  const [deviceRetests, setDeviceRetests] = useState<Record<DeviceCheck, RetestOutcome>>({ ...INITIAL_RETEST });
  const [retestFollowups, setRetestFollowups] = useState<Record<DeviceCheck, FollowupStage>>({ ...INITIAL_RETEST_FOLLOWUP });
  const [auditBaseline, setAuditBaseline] = useState<WindowsRetestAuditItem[] | null>(null);
  const isOwner = role === "owner";
  const done = REVIEW_AREAS.filter(area => findings[area.id] !== "not_checked").length;
  const changesNeeded = REVIEW_AREAS.filter(area => findings[area.id] === "needs_change").length;
  const result = done < REVIEW_AREAS.length ? "INCOMPLETE_OWNER_SCREEN_REVIEW" :
    changesNeeded > 0 ? "CHANGES_REQUESTED_IN_LOCAL_REVIEW" : "ALL_AREAS_MARKED_ACCEPTABLE_LOCALLY";
  const deviceCompleted = DEVICE_CHECKS.filter(check => deviceFindings[check.id] !== "not_checked").length;
  const deviceFailed = DEVICE_CHECKS.filter(check => deviceFindings[check.id] === "observed_fail").length;
  const deviceResult = deviceContext === "not_checked" || deviceCompleted !== DEVICE_CHECKS.length ? "ON_DEVICE_WALKTHROUGH_INCOMPLETE" :
    deviceFailed > 0 ? "OWNER_REPORTED_DEVICE_ISSUES" : "OWNER_REPORTED_DEVICE_CHECKS_PASS_UNVERIFIED";
  const windowsRetest = makeWindowsThemeRetestDisposition(deviceContext, DEVICE_CHECKS.map(check => ({
    id: check.id, observation: deviceFindings[check.id], retest: deviceRetests[check.id]
  })));
  const windowsContext = deviceContext === "windows_hub_server" || deviceContext === "remote_windows_client";
  const windowsFollowup = makeWindowsRetestFollowup(deviceContext, DEVICE_CHECKS.map(check => ({
    id: check.id, observation: deviceFindings[check.id], retest: deviceRetests[check.id], stage: retestFollowups[check.id]
  })));
  const auditCurrent: WindowsRetestAuditItem[] = windowsFollowup.items.map(item => ({
    check: item.check, retest: item.retest, ownerReportedFollowup: item.ownerReportedFollowup
  }));
  const windowsRetestAudit = makeWindowsOwnerRetestAudit(deviceContext, auditBaseline, auditCurrent);
  const ql275FollowupReview = makeQl275OwnerFollowupReview(windowsRetestAudit);
  const nextUnchecked = REVIEW_AREAS.find(area => findings[area.id] === "not_checked");

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
      onDevice: { context: deviceContext, completed: deviceCompleted, failed: deviceFailed,
        outcome: deviceResult, checks: DEVICE_CHECKS.map(check => ({ check: check.id, finding: deviceFindings[check.id] })),
        actualWindowsMachineIdentity: "NOT_COLLECTED", independentlyWitnessedPhysicalAcceptance: "NOT_VERIFIED" },
      windowsThemeRetest: windowsRetest,
      windowsRetestFollowup: windowsFollowup,
      windowsOwnerRetestAudit: windowsRetestAudit,
      ql275DeferredOwnerFollowupReview: ql275FollowupReview,
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
      <div><p className="eyebrow">Build 201 · Standard theme review usability</p><h2 id="theme-owner-acceptance-title">Standard Theme Owner Acceptance</h2></div>
      <span className="hub-guard-badge">{done}/{REVIEW_AREAS.length} screens reviewed</span>
    </div>
    <nav className="hub-theme-review-jumps" aria-label="Owner theme review steps">
      <a href="#hub-theme-screen-review">1 · Screen review ({done}/{REVIEW_AREAS.length})</a>
      <a href="#hub-theme-device-review">2 · On-device checks ({deviceCompleted}/{DEVICE_CHECKS.length})</a>
      <a href="#hub-theme-retest-review">3 · Windows retest ({windowsRetest.retestsPending} pending)</a>
      <a href="#hub-theme-issue-review">4 · Visual issues ({changesNeeded} open)</a>
    </nav>
    <div className="hub-theme-review-next" role="region" aria-label="Next unreviewed owner screen">
      <p><strong>Next screen:</strong> {nextUnchecked ? `${nextUnchecked.title} — ${nextUnchecked.detail}` : "All five areas have local findings."} Open a real workspace, look at its actual information, return to System and record the result below. No findings are sent to a server.</p>
      <button type="button" disabled={!isOwner || !nextUnchecked || !onNavigate}
        onClick={() => { if (nextUnchecked) onNavigate?.(nextUnchecked.target); }}>
        {nextUnchecked ? `Open next screen: ${nextUnchecked.title}` : "All screens reviewed"}
      </button>
    </div>
    <div id="hub-theme-device-review" className="hub-theme-device" role="region" aria-label="Standard theme on-device field checks">
      <div className="hub-evidence-title"><h3>On-device acceptance · actual Hub screen</h3><span className="hub-guard-badge">{deviceCompleted}/{DEVICE_CHECKS.length} owner observations</span></div>
      <p>These checks must be performed <strong>on the real Windows Hub or a real connected client</strong>. Choose where you tested; we do not read machine identity, use device telemetry, or treat a simulated browser test or source CI as physical acceptance. This is an owner-reported, browser-session-only worksheet.</p>
      <label htmlFor="theme-device-context">Where did we personally test the screens?</label>
      <select id="theme-device-context" disabled={!isOwner} value={deviceContext}
        onChange={event => { setDeviceContext(event.target.value as DeviceContext); setDeviceFindings({ ...INITIAL_DEVICE }); setDeviceRetests({ ...INITIAL_RETEST }); setRetestFollowups({ ...INITIAL_RETEST_FOLLOWUP }); setAuditBaseline(null); setHandoff(""); }}>
        <option value="not_checked">Not tested on a device</option>
        <option value="windows_hub_server">Windows Hub server (owner-reported)</option>
        <option value="remote_windows_client">Remote Windows Hub client (owner-reported)</option>
        <option value="other_browser_device">Other actual browser device (owner-reported)</option>
      </select>
      <div className="hub-theme-device-grid">
        {DEVICE_CHECKS.map(check => <div className="hub-theme-device-check" key={check.id}>
          <div><strong>{check.title}</strong><small>{check.detail}</small></div>
          <label htmlFor={`theme-device-${check.id}`}>Observed result</label>
          <select id={`theme-device-${check.id}`} disabled={!isOwner || deviceContext === "not_checked"}
            value={deviceFindings[check.id]} onChange={event => {
              setDeviceFindings(current => ({ ...current, [check.id]: event.target.value as DeviceFinding }));
              setDeviceRetests(current => ({ ...current, [check.id]: "not_retested" })); setHandoff("");
              setRetestFollowups(current => ({ ...current, [check.id]: "not_requested" }));
              setAuditBaseline(null);
            }}>
            <option value="not_checked">Not checked</option>
            <option value="observed_pass">Personally observed: passes</option>
            <option value="observed_fail">Personally observed: fails</option>
          </select>
        </div>)}
      </div>
      <p><strong>On-device result:</strong> <span aria-label="Standard theme on-device review status">{deviceResult}</span>. Independent Windows witnessing and installation acceptance remain NOT VERIFIED, even if every owner observation passes.</p>
      <div id="hub-theme-retest-review" className="hub-theme-retest" role="region" aria-label="Windows theme retest disposition">
        <div className="hub-evidence-title"><h3>Windows theme retest · prior failures only</h3><span className="hub-guard-badge">{windowsRetest.retestsPending} pending</span></div>
        <p>This is a second owner-observed check after a reported failure—not engineering sign-off. Retesting is eligible only when we selected the actual Windows Hub server or an actual remote Windows client. Changing the device or original finding resets that check's retest and follow-up.</p>
        {deviceFailed === 0 ? <p>No failed on-device observations are available to retest.</p> :
          DEVICE_CHECKS.filter(check => deviceFindings[check.id] === "observed_fail").map(check =>
            <div className="hub-theme-retest-item" key={check.id}>
              <strong>{check.title}</strong>
              <label htmlFor={`theme-retest-${check.id}`}>Retest disposition</label>
              <select id={`theme-retest-${check.id}`} value={deviceRetests[check.id]} disabled={!isOwner || !windowsContext}
                onChange={event => { setDeviceRetests(current => ({ ...current, [check.id]: event.target.value as RetestOutcome })); setHandoff(""); }}>
                <option value="not_retested">Not retested</option>
                <option value="issue_persists">Personally retested: issue persists</option>
                <option value="owner_reports_improvement">Personally retested: looks improved (unverified)</option>
              </select>
              <label htmlFor={`theme-retest-followup-${check.id}`}>Engineering follow-up</label>
              <select id={`theme-retest-followup-${check.id}`} value={retestFollowups[check.id]} disabled={!isOwner || !windowsContext}
                onChange={event => { setRetestFollowups(current => ({ ...current, [check.id]: event.target.value as FollowupStage })); setHandoff(""); }}>
                <option value="not_requested">Not requested</option>
                <option value="engineering_review_requested">Review requested (owner report)</option>
                <option value="owner_retest_ready_reported">Ready to retest reported (not verified)</option>
              </select>
            </div>)}
        <p><strong>Windows retest outcome:</strong> <span aria-label="Windows theme retest status">{windowsRetest.outcome}</span>. Independent Windows witness and real installation acceptance remain NOT VERIFIED.</p>
        <p><strong>Build 198 follow-up:</strong> <span aria-label="Windows retest engineering follow-up status">{windowsFollowup.openFollowups} open or awaiting owner retest · {windowsFollowup.reportedImprovementAwaitingWitness} reported improvements awaiting independent witness</span>. These notes do not open engineering tickets or prove an installed fix.</p>
        <div className="hub-windows-audit" role="region" aria-label="Build 199 Windows owner retest follow-up audit">
          <h3>Owner retest change audit</h3>
          <p>Capture a local starting snapshot after personally inspecting failed checks on Windows. Change a retest or follow-up above to compare what changed. This is temporary browser memory, not a backend audit receipt, engineering acceptance or independent field witness. Original failures or device changes clear the old snapshot.</p>
          <div className="hub-connection-actions">
            <button type="button" disabled={!isOwner || !windowsContext || auditCurrent.length === 0}
              onClick={() => { setAuditBaseline(auditCurrent); setHandoff(""); }}>Capture owner retest baseline (local)</button>
            <button type="button" disabled={!isOwner || auditBaseline === null}
              onClick={() => { setAuditBaseline(null); setHandoff(""); }}>Clear owner retest baseline</button>
          </div>
          <p><strong>Owner retest audit:</strong> <span aria-label="Windows owner retest audit status">{windowsRetestAudit.auditStatus}</span> · {windowsRetestAudit.changedChecks} changed check(s) · 0 independently witnessed.</p>
          {windowsRetestAudit.transitions.filter(item => item.transition !== "UNCHANGED").map(item =>
            <p key={item.check} className="hub-windows-audit-change"><strong>{item.check}:</strong> {item.transition.replaceAll("_", " ")} — reported retest {item.previousRetest.replaceAll("_", " ")} → {item.currentRetest.replaceAll("_", " ")}</p>)}
        </div>
        <div className="hub-ql275-windows" role="region" aria-label="QL-275 deferred Windows owner follow-up review">
          <div className="hub-evidence-title"><h3>Build 200 · Windows follow-up</h3><span className="hub-ql275-badge">Under Review</span></div>
          <p>QL-275 follow-up is paused until requested again. The current local Windows checklist has <strong>{ql275FollowupReview.ownerReportedChanges} owner-reported change(s)</strong> and {ql275FollowupReview.reportedImprovementsAwaitingIndependentWitness} reported improvement(s) still without an independent witness. No signed device acceptance, engineering fix or backend receipt is inferred.</p>
        </div>
      </div>
    </div>
    <p>Review the <strong>actual application screens</strong> with our new midnight Standard theme. Use each card's Open workspace shortcut; your findings now survive these in-app navigation changes. They remain only in this browser session and cannot authorize connections.</p>
    <p><strong>Current view:</strong> {appearance === "standard" ? "Standard (midnight)" : "High contrast"} · {density} density. Change these in the sidebar to check readability before recording findings.</p>
    {!isOwner && <p role="note">Administrator view only. A signed owner acceptance cannot be inferred from an administrator session.</p>}
    <div id="hub-theme-screen-review" className="hub-theme-review-grid">
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
    <div id="hub-theme-issue-review" className="hub-theme-issues" role="region" aria-label="Standard theme visual issue follow-up queue">
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
      <button type="button" disabled={!isOwner} onClick={() => { setFindings({ ...INITIAL }); setIssues({ ...INITIAL_ISSUES }); setFollowups({ ...INITIAL_FOLLOWUPS }); setDeviceContext("not_checked"); setDeviceFindings({ ...INITIAL_DEVICE }); setDeviceRetests({ ...INITIAL_RETEST }); setRetestFollowups({ ...INITIAL_RETEST_FOLLOWUP }); setAuditBaseline(null); setHandoff(""); }}>Reset this session's review</button>
    </div>
    <pre aria-label="Build 194 sanitized Standard theme review report">{handoff || "No owner visual-review report prepared. External pilot authorization is unrelated and remains HELD."}</pre>
  </section>;
}
