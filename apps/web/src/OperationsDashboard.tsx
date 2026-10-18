import { useCallback, useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(false);

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
    setSnapshot({ signals: summarizeOperations(results), sampledAt: new Date() });
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
            onClick={() => setContext(item)}
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
      <section className="panel operations-daily-actions" aria-label="Daily operations action queue">
        <h3>Today's manual follow-ups — {context}</h3>
        <p>
          Suggested from the last manual snapshot. Needs review comes first;
          unverified is not healthy, and optional setup is not a fault.
          No action is executed from this list.
        </p>
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
                    <button type="button" onClick={() => onNavigate(action.section)}>
                      Open {action.section} for manual review
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
