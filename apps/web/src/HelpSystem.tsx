import { useEffect, useState } from "react";

interface HelpTopic {
  purpose: string;
  tasks: string[];
  safety: string[];
  troubleshooting: string[];
}

const HELP_TOPICS: Record<string, HelpTopic> = {
  Home: {
    purpose: "Shows overall Hub health and shortcuts to the major local-first capabilities.",
    tasks: [
      "Confirm the backend and Ollama health cards are online.",
      "Use the dashboard cards to move directly into Chat, Knowledge, Devices, MQTT, Automations, or Notifications.",
      "Treat Home as the first place to check after an update or restart.",
    ],
    safety: [
      "Home is an overview; physical changes still pass through the permission and tool layers.",
      "An offline provider does not disable local dashboards, saved history, or deterministic automations.",
    ],
    troubleshooting: [
      "Backend offline: start or restart the FastAPI process and verify port 8765.",
      "Ollama offline: start Ollama locally and verify the configured base URL.",
    ],
  },
  Chat: {
    purpose: "Provides provider-aware AI conversations with saved history, profiles, and grounded local tools.",
    tasks: [
      "Choose the profile that matches the job: General, Coding, Home, Workshop, or Business.",
      "Select an installed model, open or create a conversation, then send the request.",
      "Use Knowledge for citation-heavy document questions when you need explicit evidence.",
      "For speech: install whisper-cli and a local model, then Record locally; review the transcript before Send.",
    ],
    safety: [
      "Local microphone transcription never sends chat or executes a device command automatically; review the editable text.",
      "AI text is not authority for physical or business state.",
      "High-risk actions remain blocked or require exact confirmation even when requested in chat.",
    ],
    troubleshooting: [
      "Speech unavailable: install the local whisper.cpp executable and GGML model; see Build 042 setup guide.",
      "Microphone unavailable: use localhost/HTTPS and grant microphone permission in the browser.",
      "No model available: install or start an Ollama model.",
      "Generation failure: keep the conversation; provider recovery does not erase history.",
    ],
  },
  Knowledge: {
    purpose: "Ingests private files, organizes collections, searches indexed content, and produces citations.",
    tasks: [
      "Create or select a collection before ingesting a document.",
      "Upload PDF, TXT, Markdown, or DOCX files, then index/re-index as needed.",
      "Use search filters and citations to verify the exact source behind an answer.",
    ],
    safety: [
      "Local-only collections should remain local unless you deliberately configure a non-local provider later.",
      "Document deletion is a confirmed Level-2 action and cannot be silently replayed.",
    ],
    troubleshooting: [
      "Needs indexing: re-index the document after confirming Ollama embeddings are available.",
      "Duplicate upload: the content hash intentionally prevents identical source duplication.",
    ],
  },
  Devices: {
    purpose: "Browses Home Assistant entities and manages the explicit safe-control allow list.",
    tasks: [
      "Refresh entity inventory and filter by area, device, domain, or state.",
      "Owner/Admin can add ordinary lights, switches, and scenes to the safe-control allow list.",
      "Use the bounded control buttons only for the exact approved entity.",
    ],
    safety: [
      "Safety-sensitive or hazardous targets remain prohibited even if their names resemble ordinary devices.",
      "Home Assistant must be available for writes; the Hub does not queue uncertain physical changes.",
    ],
    troubleshooting: [
      "Connection unavailable: verify HOME_ASSISTANT_URL and the token in Secrets or environment.",
      "Control denied: verify entity type, allow-list membership, tool enable state, and current HA state.",
    ],
  },
  Cameras: {
    purpose: "Shows the local camera dashboard, health, ONVIF/RTSP administration, and optional read-only Frigate object events.",
    tasks: [
      "Use the summary cards to see total, enabled, configured, healthy, and attention-needed cameras.",
      "Owner/Admin can run health checks and maintain the existing ONVIF and encrypted RTSP configuration.",
      "Healthy configured cameras render through the loopback-only go2rtc viewer.",
      "When Frigate is installed locally, review its camera inventory and recent normalized object events in the Frigate adapter panel.",
    ],
    safety: [
      "Camera source credentials remain server-side and never enter the browser.",
      "Frigate Build 034 is read-only: the Hub does not change Frigate configuration, recordings, retention, labels, users, or events.",
      "The Frigate internal API is accepted only on localhost/loopback; do not expose its unauthenticated internal port to the LAN or internet.",
    ],
    troubleshooting: [
      "Frigate offline is non-fatal: the camera dashboard and go2rtc continue to work without it.",
      "For Frigate, verify the local service is reachable at FRIGATE_BASE_URL and remains bound to loopback.",
      "For live-view or camera-health issues, verify go2rtc, RTSP configuration, and private camera reachability separately.",
    ],
  },
  MQTT: {
    purpose: "Connects to the authenticated local MQTT broker within an explicit topic allow list.",
    tasks: [
      "Verify broker status before subscribing or publishing.",
      "Subscribe only to an allowed filter and publish only to a concrete allowed topic.",
      "Use the recent-message view for local diagnostics; automation history is stored separately.",
    ],
    safety: [
      "Anonymous fallback is prohibited and retained messages are blocked by the Hub publish path.",
      "Broker credentials stay server-side and raw MQTT automation payloads are not written to run history.",
    ],
    troubleshooting: [
      "Not configured: set broker host, username, password, and MQTT_ALLOWED_TOPICS.",
      "Subscription denied: compare the requested filter exactly with the configured allow-list policy.",
    ],
  },
  Notifications: {
    purpose: "Shows persistent local household alerts created by the Hub and deterministic automations.",
    tasks: [
      "Filter by read state or severity, then mark items read or dismiss them for your account.",
      "Owner/Admin can use Send local test to verify the notification path.",
      "Automation authors can use notification.household.send for Level-1 in-app alerts.",
    ],
    safety: [
      "Build 030 notifications are local in-app records only; they do not send email, SMS, or external push messages.",
      "External messaging remains Level-2 and is not introduced by this build.",
    ],
    troubleshooting: [
      "No alert appears: verify the automation run succeeded and notification.household.send is enabled in Tools.",
      "After an upgrade, run Alembic to head so notifications and notification_receipts exist.",
    ],
  },
  Business: {
    purpose:
      "Provides bounded live reads for all three businesses plus Build 040's two exact Level-2 confirmed writes: a Devil n Dove review-only story draft and a Yard Workers private internal job comment.",
    tasks: [
      "Keep the existing business credentials in Secrets; Build 040 introduces no new provider credential.",
      "For Devil n Dove, enter a product ID and draft wording, then Prepare exact confirmation, review the arguments, Approve exact write, and Execute confirmed write.",
      "For Yard Workers, enter the numeric job ID and internal update, then use the same three-stage confirmation flow. The signed-in Yard Workers user needs Jobs create access and Supervisor+ authority.",
      "Use the existing Read buttons for bounded previews. Rosie Dazzlers remains strictly read-only in Build 040.",
    ],
    safety: [
      "There is no generic business write proxy. Only business.devilndove.story_draft.create and business.yardworkers.job_comment.create are registered write tools.",
      "Devil n Dove is forced to display_status=draft and privacy_status=needs_review; the Hub cannot approve or publish the story.",
      "Yard Workers is forced to comment_type=update, visible_to_client=false, is_special_instruction=false, and set_job_instruction=false.",
      "Rosie Dazzlers inherits the hard-blocked base write path because its current mutation APIs are broader than this safety boundary.",
      "Exact confirmation is consumed before the external request. A timeout, provider error, or ambiguous result is never automatically retried; inspect the source system before preparing a new confirmation.",
    ],
    troubleshooting: [
      "Unconfigured: add or rotate every required connector credential in Secrets; session-style access tokens can expire.",
      "Confirmation mismatch or replay rejection: prepare a new exact confirmation only for the intended arguments.",
      "Yard Workers write rejected: refresh the access token and verify Jobs create permission plus Supervisor+ role.",
      "After a failed/uncertain write, inspect the source system first because the approval has already been consumed and the Hub deliberately will not retry it.",
    ],
  },
  System: {
    purpose: "Represents system-level health and operating context for the local Hub.",
    tasks: [
      "Use Home health cards, Audit, Tools, Secrets, and Notifications for the detailed subsystem views.",
      "After updates, verify /health, /version, migrations, and the four CI lanes before treating the build as ready.",
    ],
    safety: [
      "Keep FastAPI, Ollama, MQTT, Home Assistant admin services, and future camera services off the public internet.",
      "Service restarts are Level-2 operations when introduced through Hub tooling.",
    ],
    troubleshooting: [
      "If a service is unavailable, verify its local process, configured port, and trusted-LAN reachability.",
      "Use Audit for durable evidence instead of relying on transient console output.",
    ],
  },
  Automations: {
    purpose: "Authors deterministic rules, including local Frigate event triggers, and exposes runtime and execution history.",
    tasks: [
      "Draft a rule, review exact Rule Schema JSON, then use the Level-2 save confirmation.",
      "Leave new rules disabled until trigger, conditions, targets, and cooldown are verified.",
      "Inspect execution history before changing a rule after a failure or interruption.",
    ],
    safety: [
      "AI may draft rules but never saves or executes them by itself.",
      "Failed/interrupted physical actions are not automatically replayed because the remote outcome may be uncertain.",
    ],
    troubleshooting: [
      "Draft rejected: fix unsupported tools, arguments, entities, or MQTT policy mismatches.",
      "Run failed: inspect failure kind, Audit evidence, tool status, and integration availability.",
    ],
  },
  Confirmations: {
    purpose: "Shows exact Level-2 action previews that require explicit Owner/Admin approval or rejection.",
    tasks: [
      "Read the summary and exact arguments before approving.",
      "Reject actions that are stale, unexpected, ambiguous, or no longer necessary.",
      "Complete the protected operation before the confirmation expires.",
    ],
    safety: [
      "Confirmations are bound to exact arguments and are single-use.",
      "Level-3 actions remain prohibited and do not become safe merely because someone requests confirmation.",
    ],
    troubleshooting: [
      "Expired: prepare a new confirmation from the original workflow.",
      "Mismatch/replay rejection: refresh the record and prepare a new exact action.",
    ],
  },
  Audit: {
    purpose: "Provides immutable, searchable evidence for authentication, tools, confirmations, automations, and important changes.",
    tasks: [
      "Filter by actor, event type, object, tool, result, confirmation, text, or time.",
      "Open sanitized arguments and result evidence for an incident or change.",
      "Use Audit alongside automation history when diagnosing physical-action failures.",
    ],
    safety: [
      "Secrets and sensitive argument fields are sanitized before persistence.",
      "Audit evidence is append-oriented; it is not a command queue.",
    ],
    troubleshooting: [
      "Unexpected empty result: clear filters and widen the time range.",
      "Missing actor on automation events is normal for server-owned deterministic execution.",
    ],
  },
  Secrets: {
    purpose: "Stores supported integration credentials encrypted at rest or reports environment-backed values.",
    tasks: [
      "Enter a replacement value, save/rotate, then verify the consuming integration.",
      "Use master-key rewrap only while both current and previous encryption keys are correctly configured; Build 032 includes encrypted camera RTSP sources in that rewrap.",
      "Keep environment-backed secrets out of GitHub and application logs.",
    ],
    safety: [
      "Saved plaintext is never redisplayed by the UI.",
      "Never remove the previous master key until rewrap has succeeded and integrations are verified.",
    ],
    troubleshooting: [
      "Encryption unavailable: configure SECRET_ENCRYPTION_KEY on the Hub machine.",
      "Integration still offline: verify the correct secret source is effective and restart when environment variables changed.",
    ],
  },
  Tools: {
    purpose: "Shows normalized tool contracts, capabilities, enable state, risk level, and confirmation policy.",
    tasks: [
      "Review the exact input/output schema before enabling a tool.",
      "Owner/Admin can disable a tool globally when an integration or delegated action should stop.",
      "Confirm automation tools are both enabled and supported by the deterministic Event Engine.",
    ],
    safety: [
      "Level-2 tools require confirmation and Level-3 tools cannot be freely delegated.",
      "Disabling a tool is an immediate policy control; enabled automations recheck tool state before execution.",
    ],
    troubleshooting: [
      "Automation rejected: make sure every referenced tool exists, is enabled, and has an Event Engine executor.",
      "Schema validation failed: correct the exact arguments rather than bypassing validation.",
    ],
  },
  Users: {
    purpose: "Manages local Hub accounts and role-based access.",
    tasks: [
      "Owner/Admin can create household or read-only accounts.",
      "Owners manage privileged roles and must preserve at least one enabled owner.",
      "Disable unused accounts rather than sharing credentials.",
    ],
    safety: [
      "Passwords are hashed and raw session tokens are not stored.",
      "Administrator privileges are narrower than Owner privileges for privileged-account changes.",
    ],
    troubleshooting: [
      "Login rejected: verify account enabled state and reset the password through an authorized admin workflow.",
      "Last-owner protection intentionally blocks removing the final enabled owner.",
    ],
  },
};

const DEFAULT_HELP: HelpTopic = {
  purpose: "Contextual help for this Rosevear AI Hub section.",
  tasks: ["Use the visible controls in sequence and review status messages before moving on."],
  safety: ["Keep high-risk or external actions behind the Hub permission and confirmation boundaries."],
  troubleshooting: ["Use Audit and the section status/error messages to identify the failing layer."],
};

export function SectionHelp({ section }: { section: string }) {
  const [open, setOpen] = useState(false);
  const topic = HELP_TOPICS[section] ?? DEFAULT_HELP;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="section-help">
      <button
        className="help-trigger"
        type="button"
        aria-label={"Help for " + section}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        i
      </button>

      {open ? (
        <aside
          className="help-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="section-help-title"
        >
          <div className="help-panel-header">
            <div>
              <p className="eyebrow">Section help</p>
              <h2 id="section-help-title">{section}</h2>
            </div>
            <button
              className="help-close"
              type="button"
              aria-label="Close help"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <p>{topic.purpose}</p>

          <section>
            <h3>Common tasks</h3>
            <ol>{topic.tasks.map((item) => <li key={item}>{item}</li>)}</ol>
          </section>

          <section>
            <h3>Safety and permissions</h3>
            <ul>{topic.safety.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>

          <section>
            <h3>Troubleshooting</h3>
            <ul>{topic.troubleshooting.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </aside>
      ) : null}
    </div>
  );
}
