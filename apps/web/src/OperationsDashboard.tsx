import { useCallback, useEffect, useRef, useState } from "react";

import {
  getBusinessConnectors,
  getCameraDashboard,
  getHomeAssistantStatus,
  getKnowledgeAdminStatus,
  getMQTTStatus,
  type AuthRole,
} from "./api";

export type OperationsContext = "Home" | "Workshop" | "Business";
export type ReadinessState = "ready" | "attention" | "optional" | "unknown";

type Signal = {
  key: string;
  title: string;
  status: ReadinessState;
  detail: string;
  section: string;
};

type Snapshot = { signals: Signal[]; sampledAt: Date };

export function summarizeOperations(
  outcomes: PromiseSettledResult<unknown>[],
): Signal[] {
  const [ha, mqtt, camera, knowledge, business] = outcomes;
  const unavailable = (key: string, title: string, section: string): Signal => ({
    key,
    title,
    section,
    status: "unknown",
    detail: "Could not verify. Open the section for details.",
  });
  const signals: Signal[] = [];
  if (ha.status === "fulfilled" && ha.value && typeof ha.value === "object") {
    const data = ha.value as {
      configured: boolean; available: boolean;
      url_configured?: boolean; token_configured?: boolean;
      recovery_reason?: string;
    };
    signals.push({
      key: "ha",
      title: "Home Assistant",
      section: "Devices",
      status: data.available ? "ready" : data.configured ? "attention" : "optional",
      detail: data.available
        ? "Connected."
        : data.configured
          ? data.recovery_reason === "authentication_rejected"
            ? "Home Assistant rejected its token. Review it privately in Secrets."
            : data.recovery_reason === "timeout"
              ? "Home Assistant timed out. Check the VM and its responsiveness."
              : data.recovery_reason === "unreachable"
                ? "Hub cannot reach Home Assistant. Check the VM network and service port."
                : "Saved connection details, but Home Assistant is not responding. Check the HA VM and Devices."
          : data.url_configured === false
            ? "Home Assistant URL is missing. Review Devices setup."
            : data.token_configured === false
              ? "Home Assistant token is missing. Review protected Devices setup."
              : "Home Assistant is not configured. Open Devices.",
    });
  } else signals.push(unavailable("ha", "Home Assistant", "Devices"));

  if (mqtt.status === "fulfilled" && mqtt.value && typeof mqtt.value === "object") {
    const data = mqtt.value as {
      configured: boolean; available: boolean;
      username_configured?: boolean; password_configured?: boolean;
      recovery_reason?: string;
    };
    signals.push({
      key: "mqtt",
      title: "MQTT",
      section: "MQTT",
      status: data.available ? "ready" : data.configured ? "attention" : "optional",
      detail: data.available
        ? "Broker connected."
        : data.configured
          ? data.recovery_reason === "broker_rejected_credentials"
            ? "MQTT broker rejected credentials. Review the account privately in MQTT."
            : data.recovery_reason === "disconnected_reconnecting"
              ? "MQTT disconnected and is reconnecting; check the broker/add-on."
              : data.recovery_reason === "starting_or_reconnecting"
                ? "MQTT connection is starting; check broker/add-on availability."
                : "Saved MQTT settings, but no active connection. Check broker availability, port and TLS."
          : "MQTT broker is not configured. Review MQTT setup.",
    });
  } else signals.push(unavailable("mqtt", "MQTT", "MQTT"));

  if (camera.status === "fulfilled" && camera.value && typeof camera.value === "object") {
    const data = camera.value as { total: number; attention: number; healthy: number };
    signals.push({
      key: "camera",
      title: "Cameras",
      section: "Cameras",
      status: data.total === 0 ? "optional" : data.attention > 0 ? "attention" : "ready",
      detail: data.total === 0
        ? "No cameras are registered in this Hub database. " +
          "Existing physical cameras are not automatically imported; check Cameras and ONVIF discovery."
        : `${data.healthy} healthy · ${data.attention} need review.`,
    });
  } else signals.push(unavailable("camera", "Cameras", "Cameras"));

  if (knowledge.status === "fulfilled" && knowledge.value && typeof knowledge.value === "object") {
    const data = knowledge.value as { document_count: number; needs_indexing_count: number };
    signals.push({
      key: "knowledge",
      title: "Knowledge",
      section: "Knowledge",
      status: data.needs_indexing_count > 0 ? "attention" : data.document_count ? "ready" : "optional",
      detail: data.needs_indexing_count
        ? `${data.needs_indexing_count} documents need indexing.`
        : data.document_count ? `${data.document_count} documents available.` : "Add the first document when ready.",
    });
  } else signals.push(unavailable("knowledge", "Knowledge", "Knowledge"));

  if (business.status === "fulfilled" && business.value && typeof business.value === "object") {
    const data = business.value as {
      connectors: { status: { configured: boolean; available: boolean } }[];
    };
    const connectors = data.connectors ?? [];
    const configured = connectors.filter((item) => item.status.configured);
    const unavailableCount = configured.filter((item) => !item.status.available).length;
    signals.push({
      key: "business",
      title: "Business connectors",
      section: "Business",
      status: unavailableCount ? "attention" : configured.length ? "ready" : "optional",
      detail: unavailableCount
        ? `${unavailableCount} configured connector(s) need review.`
        : configured.length ? `${configured.length} configured connector(s) available.`
          : "Connect businesses when needed.",
    });
  } else signals.push(unavailable("business", "Business connectors", "Business"));
  return signals;
}

const visibleKeys: Record<OperationsContext, string[]> = {
  Home: ["ha", "mqtt", "camera"],
  Workshop: ["knowledge", "camera", "mqtt"],
  Business: ["business", "knowledge", "mqtt"],
};

// Build 083: finite, advisory worklist from an explicitly refreshed snapshot.
// Never interpolate raw backend responses, error strings, hostnames or credentials.
export type DailyAction = {
  key: string;
  title: string;
  section: string;
  priority: "review" | "verify" | "setup";
  reason: string;
};

const dailyActionCopy: Record<string, { title: string; section: string }> = {
  ha: { title: "Review Home Assistant connection", section: "Devices" },
  mqtt: { title: "Check the MQTT broker", section: "MQTT" },
  camera: { title: "Review the camera registry", section: "Cameras" },
  knowledge: { title: "Review knowledge collections", section: "Knowledge" },
  business: { title: "Review business connectors", section: "Business" },
};

const actionPriority: Record<DailyAction["priority"], number> = {
  review: 0,
  verify: 1,
  setup: 2,
};

export function prioritizeDailyActions(
  signals: Signal[],
  context: OperationsContext,
): DailyAction[] {
  const contextKeys = visibleKeys[context];
  return signals.flatMap((signal): DailyAction[] => {
    const item = dailyActionCopy[signal.key];
    if (!item || !contextKeys.includes(signal.key) || signal.status === "ready") return [];
    const priority: DailyAction["priority"] = signal.status === "attention"
      ? "review" : signal.status === "unknown" ? "verify" : "setup";
    const reason = priority === "review"
      ? "A configured service reports that it needs attention. Review manually."
      : priority === "verify"
        ? "Current status could not be verified. Do not assume this service is healthy."
        : "Optional setup is incomplete; there is no implied service failure.";
    return [{ key: signal.key, title: item.title, section: item.section, priority, reason }];
  }).sort((a, b) => actionPriority[a.priority] - actionPriority[b.priority]
    || contextKeys.indexOf(a.key) - contextKeys.indexOf(b.key)).slice(0, 3);
}

// Build 085: finite, context-scoped comparison of two manual snapshots.
// Only known service keys and states are compared. Never copy provider details.
export type SnapshotChange = {
  key: string;
  title: string;
  previous: ReadinessState;
  current: ReadinessState;
  type: "needs_review" | "verification_lost" | "improved" | "changed";
  guidance: string;
};

const snapshotStateAllowed: ReadinessState[] = ["ready", "attention", "optional", "unknown"];
const snapshotChangePriority: Record<SnapshotChange["type"], number> = {
  needs_review: 0,
  verification_lost: 1,
  changed: 2,
  improved: 3,
};

export function compareOperationsSnapshots(
  previous: Signal[],
  current: Signal[],
  context: OperationsContext,
): SnapshotChange[] {
  const keys = visibleKeys[context];
  const prior = new Map(previous.filter((signal) =>
    keys.includes(signal.key) && snapshotStateAllowed.includes(signal.status))
    .map((signal) => [signal.key, signal.status]));
  const seen = new Set<string>();
  return current.flatMap((signal): SnapshotChange[] => {
    if (!keys.includes(signal.key) || !dailyActionCopy[signal.key] ||
      !snapshotStateAllowed.includes(signal.status) || seen.has(signal.key)) return [];
    seen.add(signal.key);
    const before = prior.get(signal.key);
    if (!before || before === signal.status) return [];
    const type: SnapshotChange["type"] = signal.status === "attention"
      ? "needs_review" : signal.status === "unknown"
        ? "verification_lost" : signal.status === "ready"
          ? "improved" : "changed";
    const guidance = type === "needs_review"
      ? "Now reports attention. Open its section and check current evidence."
      : type === "verification_lost"
        ? "Verification is no longer available. Do not assume the service is healthy."
        : type === "improved"
          ? "Now reports ready. Confirm operation separately; this is not safety certification."
          : "Reported configuration state changed. Confirm manually.";
    return [{
      key: signal.key, title: dailyActionCopy[signal.key].title,
      previous: before, current: signal.status, type, guidance,
    }];
  }).sort((a, b) => snapshotChangePriority[a.type] - snapshotChangePriority[b.type]
    || keys.indexOf(a.key) - keys.indexOf(b.key));
}

// Build 086: deliberate, read-only, allowlisted operations handoff text.
// No raw provider payloads, errors, credentials, IP addresses or account information.
export function createOperationsHandoff(
  context: OperationsContext,
  current: Snapshot,
  previous: Snapshot | null,
  reviewed: SnapshotReview,
): string {
  const keys = visibleKeys[context];
  const statuses = keys.map((key) => {
    const signal = current.signals.find((item) =>
      item.key === key && snapshotStateAllowed.includes(item.status));
    const safeStatus: ReadinessState = signal?.status ?? "unknown";
    return `- ${dailyActionCopy[key].title}: ${labels[safeStatus]}`;
  });
  const actions = prioritizeDailyActions(current.signals, context);
  const followUps = actions.length
    ? actions.map((action) =>
      `- ${action.title}: ${reviewed[action.key as keyof SnapshotReview] ? "Reviewed for this snapshot, NOT resolved" : "Awaiting manual review"} (${action.priority === "review" ? "needs review" : action.priority === "verify" ? "unverified" : "optional setup"})`)
    : ["- No follow-ups suggested by this snapshot; not a safety finding."];
  const changes = previous
    ? compareOperationsSnapshots(previous.signals, current.signals, context)
    : [];
  const changeLines = !previous
    ? ["- No earlier snapshot available for comparison."]
    : changes.length
      ? changes.map((change) =>
        `- ${change.title}: ${labels[change.previous]} -> ${labels[change.current]} (${change.type === "improved" ? "reported ready; confirm separately" : change.type === "verification_lost" ? "verification lost" : change.type === "needs_review" ? "needs manual review" : "configuration changed"})`)
      : ["- No reported status changes; physical health is not certified."];
  return [
    `Rosevear AI Hub — ${context} operations handoff (MANUAL SNAPSHOT)`,
    `Current sample: ${current.sampledAt.toISOString()}`,
    previous ? `Compared with: ${previous.sampledAt.toISOString()}` : "Compared with: unavailable",
    "",
    "Reported service states:",
    ...statuses,
    "",
    "Top manual follow-ups (reviewed is not resolved):",
    ...followUps,
    "",
    "Reported changes:",
    ...changeLines,
    "",
    "Operator verification: required before any real-world action.",
    "Server reboot persistence: deferred; not proven by this report.",
    "No device, camera, MQTT or business action executed.",
    "This text is a private review aid, not a repair or safety certificate.",
  ].join("\n");
}

// Build 084: review is operator acknowledgement of a single snapshot, NOT repair.
// Keep only finite recognized action keys; never persist, publish or call services.
export type SnapshotReview = Partial<Record<"ha" | "mqtt" | "camera" | "knowledge" | "business", true>>;
export function countSnapshotReviews(actions: DailyAction[], reviewed: SnapshotReview) {
  const acknowledged = actions.filter((action) => reviewed[action.key as keyof SnapshotReview] === true).length;
  return { acknowledged, outstanding: actions.length - acknowledged };
}

const labels: Record<ReadinessState, string> = {
  ready: "Ready",
  attention: "Needs review",
  optional: "Not configured",
  unknown: "Not verified",
};

const guide: Record<OperationsContext, { title: string; section: string; description: string }[]> = {
  Home: [
    { title: "Review Home Assistant connection", section: "Devices", description: "Configure local URL and token in its protected setup." },
    { title: "Inspect MQTT broker", section: "MQTT", description: "Check broker settings and allowed topics. No messages are sent here." },
    { title: "Check registered cameras", section: "Cameras", description: "Frigate is optional; camera monitoring works without it." },
  ],
  Workshop: [
    { title: "Create a knowledge collection", section: "Knowledge", description: "Organize workshop documents without uploading externally." },
    { title: "Start a local AI conversation", section: "Chat", description: "Choose a model and profile; no machine controls are triggered." },
    { title: "Check camera availability", section: "Cameras", description: "Review status before using equipment; no camera commands run." },
  ],
  Business: [
    { title: "Review business connector status", section: "Business", description: "Multiple businesses supported; no business records modified." },
    { title: "Review business knowledge", section: "Knowledge", description: "Use separate collections for different projects." },
    { title: "Check pending notifications", section: "Notifications", description: "Read existing alerts without sending new notifications." },
  ],
};

export function OperationsDashboard({
  role,
  onNavigate,
}: {
  role: AuthRole;
  onNavigate: (section: string) => void;
}) {
  const [context, setContext] = useState<OperationsContext>("Home");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<Snapshot | null>(null);
  const latestSnapshotRef = useRef<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState<SnapshotReview>({});
  const [handoffVisible, setHandoffVisible] = useState(false);
  const [handoffAccepted, setHandoffAccepted] = useState<OperationsContext | null>(null);
  const [verificationFilter, setVerificationFilter] = useState<"all" | "unreviewed">("all");
  const [triageUnreviewedOnly, setTriageUnreviewedOnly] = useState(false);

  const refresh = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    const results = await Promise.allSettled([
      getHomeAssistantStatus(signal),
      getMQTTStatus(signal),
      getCameraDashboard(signal),
      getKnowledgeAdminStatus(signal),
      getBusinessConnectors(signal),
    ]);
    if (signal.aborted) return;
    // Compare manual samples in memory only; never retain or export provider payloads.
    const next = { signals: summarizeOperations(results), sampledAt: new Date() };
    setPreviousSnapshot(latestSnapshotRef.current);
    latestSnapshotRef.current = next;
    // A new measurement invalidates all prior acknowledgement and any visible handoff text.
    setHandoffVisible(false);
    setHandoffAccepted(null);
    setVerificationFilter("all");
    setTriageUnreviewedOnly(false);
    setReviewed({});
    setSnapshot(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const visible = snapshot?.signals.filter((item) => visibleKeys[context].includes(item.key)) ?? [];
  const needsReview = visible.filter((item) => item.status === "attention").length;
  const notVerified = visible.filter((item) => item.status === "unknown").length;
  const dailyActions = snapshot ? prioritizeDailyActions(snapshot.signals, context) : [];
  const reviewCounts = countSnapshotReviews(dailyActions, reviewed);
  const snapshotChanges = snapshot && previousSnapshot
    ? compareOperationsSnapshots(previousSnapshot.signals, snapshot.signals, context) : [];
  return (
    <section className="operations-dashboard" aria-label="Unified operations dashboard">
      <div className="operations-toolbar">
        <div>
          <h2>Operations overview</h2>
          <p>Read-only status and guided setup for our local Hub.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => {
          const controller = new AbortController();
          void refresh(controller.signal);
        }}>{loading ? "Checking…" : "Refresh overview"}</button>
      </div>
      <fieldset className="operations-contexts">
        <legend>Working context</legend>
        {(["Home", "Workshop", "Business"] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={context === item}
            className={context === item ? "context-selected" : ""}
            onClick={() => { setContext(item); setHandoffVisible(false); setHandoffAccepted(null); setVerificationFilter("all"); setTriageUnreviewedOnly(false); }}
          >{item}</button>
        ))}
      </fieldset>
      <p className="operations-summary" role="status">
        {loading && !snapshot ? "Checking local services…" : snapshot
          ? `${context}: ${needsReview} need review · ${notVerified} unverified · ${visible.length} status cards.`
          : "Status not yet available."}
      </p>
      {snapshot && (
        <small className="operations-timestamp">
          Last checked: {snapshot.sampledAt.toLocaleString()} · Values are snapshots, not live monitoring.
        </small>
      )}
      <section className="panel operations-snapshot-changes" aria-label="Changes since previous overview check">
        <h3>What changed since the last check? — {context}</h3>
        {!snapshot ? <p>Checking current local service status…</p>
          : !previousSnapshot
            ? <p>No comparison yet. Refresh overview to compare two manual snapshots.</p>
            : snapshotChanges.length === 0
              ? <p>No reported state changes for this context between these two checks.
                This does not verify health or physical safety.</p>
              : (
                <ol>
                  {snapshotChanges.map((change) => (
                    <li key={change.key}>
                      <strong>{change.title}</strong>
                      <p>{labels[change.previous]} → {labels[change.current]}.
                        {" "}{change.guidance}</p>
                      <button type="button" onClick={() => onNavigate(dailyActionCopy[change.key].section)}>
                        Open {dailyActionCopy[change.key].section} to verify
                      </button>
                    </li>
                  ))}
                </ol>
              )}
        {previousSnapshot && snapshot && (
          <small>Previous: {previousSnapshot.sampledAt.toLocaleString()}
            {" "}· Current: {snapshot.sampledAt.toLocaleString()}.
            Comparing reports, not confirming a repair or automatic recovery.</small>
        )}
      </section>
      <section className="panel operations-handoff" aria-label="Private operations handoff summary">
        <h3>Manual operations handoff — {context}</h3>
        <p>Prepare a copyable, private snapshot summary using only approved service
          names and status categories. Nothing is saved, sent or automatically copied.
          Review does not mean resolved, and a reported Ready does not prove safety.</p>
        <button
          type="button"
          disabled={!snapshot || loading}
          aria-expanded={handoffVisible}
          onClick={() => setHandoffVisible((visible) => !visible)}
        >{handoffVisible ? "Hide private handoff report" : "Show private handoff report"}</button>
        {snapshot && handoffVisible && (
          <>
            <p>Select the text below to copy deliberately. Treat it as a private
              operating note; verify any conditions in their original sections.</p>
            <textarea
              aria-label="Copyable operations handoff report"
              readOnly
              rows={16}
              value={createOperationsHandoff(context, snapshot, previousSnapshot, reviewed)}
            />
          </>
        )}
        {snapshot && (
          <div className="operations-handoff-acceptance" aria-label="Manual handoff acceptance">
            <h4>Handoff acceptance checklist</h4>
            <p>Before marking this handoff reviewed, check its context, snapshot time,
              reported states, and outstanding follow-ups. Review is not resolution,
              safety certification, live Windows acceptance or permission to control devices.</p>
            <ul>
              <li>Confirm the selected {context} context and snapshot timestamp.</li>
              <li>Review current unverified and needs-review status cards.</li>
              <li>Check outstanding follow-ups in their original sections before acting.</li>
              <li>Share the private report only with an intended recipient, if needed.</li>
            </ul>
            <button type="button" disabled={loading || !handoffVisible}
              aria-pressed={handoffAccepted === context}
              onClick={() => setHandoffAccepted((value) => value === context ? null : context)}>
              {handoffAccepted === context
                ? "Reopen handoff review"
                : "Mark handoff reviewed (not resolved)"}
            </button>
            <p role="status">{handoffAccepted === context
              ? "Handoff reviewed for this snapshot only — follow-ups remain open until independently verified."
              : "Handoff not yet reviewed for this snapshot."}</p>
          </div>
        )}
      </section>
      <section className="panel operations-daily-actions" aria-label="Daily operations action queue">
        <h3>Today's manual follow-ups — {context}</h3>
        <p>
          Suggested from the last manual snapshot. Needs review comes first;
          unverified is not healthy, and optional setup is not a fault.
          No action is executed from this list. Review marks last only for this
          page session and reset when the status snapshot is refreshed.
        </p>
        {snapshot && dailyActions.length > 0 && (
          <p role="status">
            {reviewCounts.outstanding} follow-up(s) not yet reviewed ·
            {" "}{reviewCounts.acknowledged} reviewed for this snapshot.
            Reviewing does not mean resolved, safe, or verified.
          </p>
        )}
        {!snapshot ? <p>Check local services before choosing a follow-up.</p>
          : dailyActions.length === 0
            ? <p>No follow-ups suggested from this snapshot. This does not certify equipment safety or reboot recovery.</p>
            : (
              <ol>
                {dailyActions.map((action) => (
                  <li key={action.key}>
                    <strong>{action.title}</strong>
                    <p>{action.priority === "review" ? "Needs review"
                      : action.priority === "verify" ? "Unverified" : "Optional setup"}: {action.reason}</p>
                    <p>
                      <strong>{reviewed[action.key as keyof SnapshotReview]
                        ? "Reviewed for this snapshot — issue may remain"
                        : "Awaiting manual review"}</strong>
                    </p>
                    <button type="button" onClick={() => onNavigate(action.section)}>
                      Open {action.section} for manual review
                    </button>
                    {" "}
                    <button
                      type="button"
                      disabled={loading}
                      aria-label={reviewed[action.key as keyof SnapshotReview]
                        ? `Reopen review of ${action.title}`
                        : `Mark ${action.title} reviewed for this snapshot`}
                      aria-pressed={reviewed[action.key as keyof SnapshotReview] === true}
                      onClick={() => setReviewed((previous) => {
                        const updated = { ...previous };
                        if (updated[action.key as keyof SnapshotReview]) {
                          delete updated[action.key as keyof SnapshotReview];
                        } else {
                          updated[action.key as keyof SnapshotReview] = true;
                        }
                        return updated;
                      })}
                    >
                      {reviewed[action.key as keyof SnapshotReview]
                        ? "Reopen review" : "Mark reviewed (not resolved)"}
                    </button>
                  </li>
                ))}
              </ol>
            )}
        {snapshot && (
          <small>Snapshot at {snapshot.sampledAt.toLocaleString()}.
            Confirm live status in the destination section before acting.</small>
        )}
      </section>
      <section className="panel operations-context-queue-summary" aria-label="Context review summary">
        <h3>Current context review summary — {context}</h3>
        {!snapshot ? <p>Collect a manual snapshot before reviewing the context summary.</p>
          : <p role="status">{reviewCounts.outstanding} not yet reviewed,
            {" "}{reviewCounts.acknowledged} reviewed for this snapshot,
            {" "}{needsReview} reporting attention and {notVerified} unverified.
            All service conditions require independent verification in their source sections.</p>}
        {snapshot && <small>This summary is local to the browser session and does not
          certify repairs, safety, reboot success or service availability.</small>}
      </section>
      <section className="panel operations-triage-summary" aria-label="Operations priority triage">
        <h3>Priority triage — {context}</h3>
        {!snapshot ? <p>Collect a manual snapshot before reviewing priorities.</p>
          : (
            <>
              <p role="status">{
                dailyActions.filter((action) => action.priority === "review").length
              } needs attention · {
                dailyActions.filter((action) => action.priority === "verify").length
              } unverified · {
                dailyActions.filter((action) => action.priority !== "review" && action.priority !== "verify").length
              } optional setup.</p>
              {dailyActions.length > 0 && (
                <button type="button" aria-pressed={triageUnreviewedOnly}
                  onClick={() => setTriageUnreviewedOnly((value) => !value)}>
                  {triageUnreviewedOnly ? "Show all triage priorities" : "Show unreviewed triage only"}
                </button>
              )}
              {dailyActions.length === 0
                ? <p>No follow-ups suggested; this does not certify service or physical safety.</p>
                : (
                  <ol>
                    {dailyActions.filter((action) => !triageUnreviewedOnly
                      || !reviewed[action.key as keyof SnapshotReview]).slice(0, 3).map((action) => (
                      <li key={action.key}>
                        <strong>{action.title}</strong> — {
                          action.priority === "review" ? "Needs attention"
                            : action.priority === "verify" ? "Unverified" : "Optional setup"
                        }. Review is not independent verification.
                        {" "}
                        <button type="button" onClick={() => onNavigate(action.section)}>
                          Triage in {action.section}
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              {triageUnreviewedOnly && dailyActions.length > 0
                && dailyActions.every((action) => reviewed[action.key as keyof SnapshotReview])
                && <p>All priorities reviewed for this snapshot; independent verification still required.</p>}
            </>
          )}
        {snapshot && <small>Read-only prioritization from this snapshot, not a device command,
          confirmed repair, safety certification or live monitoring.</small>}
      </section>
      <section className="panel operations-verification-plan" aria-label="Manual verification plan">
        <h3>Next manual verification — {context}</h3>
        <p>Plan only: reviewing a follow-up does not verify it, repair a service,
          approve an operation or close an incident. Open the original section to verify.</p>
        {snapshot && dailyActions.length > 0 && (
          <div className="operations-verification-filter" role="group" aria-label="Verification queue filter">
            <button type="button" aria-pressed={verificationFilter === "all"}
              onClick={() => setVerificationFilter("all")}>All follow-ups</button>
            <button type="button" aria-pressed={verificationFilter === "unreviewed"}
              onClick={() => setVerificationFilter("unreviewed")}>Not yet reviewed</button>
            <p role="status">{dailyActions.filter((action) =>
              !reviewed[action.key as keyof SnapshotReview]).length} not yet reviewed;
              all follow-ups still require independent verification.</p>
          </div>
        )}
        {!snapshot ? <p>Collect a status snapshot to prepare a verification plan.</p>
          : dailyActions.length === 0
            ? <p>No follow-ups suggested for this snapshot; this is not a safety clearance.</p>
            : (
              <ol>
                {dailyActions.filter((action) => verificationFilter === "all"
                  || !reviewed[action.key as keyof SnapshotReview]).map((action) => (
                  <li key={action.key}>
                    <strong>{action.title}</strong>
                    <p>{reviewed[action.key as keyof SnapshotReview]
                      ? "Previously reviewed for this snapshot; independent verification still required."
                      : "Awaiting manual review and independent verification."}</p>
                    <button type="button" onClick={() => onNavigate(action.section)}>
                      Verify in {action.section}
                    </button>
                  </li>
                ))}
              </ol>
            )}
        {snapshot && dailyActions.length > 0 && verificationFilter === "unreviewed"
          && dailyActions.every((action) => reviewed[action.key as keyof SnapshotReview])
          && <p>All suggested follow-ups reviewed for this snapshot; independent verification remains required.</p>}
        {snapshot && <small>Planning reflects only the current manually collected snapshot.
          Do not use this as proof of Windows reboot, device safety, or restored connectivity.</small>}
      </section>
      <div className="operations-status-grid">
        {visible.map((item) => (
          <article className="panel" key={item.key}>
            <h3>{item.title}</h3>
            <p><strong className={`operations-state operations-${item.status}`}>{labels[item.status]}</strong></p>
            <p>{item.detail}</p>
            <button type="button" onClick={() => onNavigate(item.section)}>
              Open {item.section}
            </button>
          </article>
        ))}
      </div>
      <section className="panel operations-guide" aria-label="Guided onboarding">
        <h3>Guided setup — {context}</h3>
        <p>Choose a step to open its page. The dashboard never changes devices or credentials.</p>
        <ol>
          {guide[context].map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
              <button type="button" onClick={() => onNavigate(step.section)}>
                Open {step.section}
              </button>
            </li>
          ))}
        </ol>
        {role === "read_only" && (
          <p>Read-only account: setup changes require an authorized account.</p>
        )}
      </section>
    </section>
  );
}
