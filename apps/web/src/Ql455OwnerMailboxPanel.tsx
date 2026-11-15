import { useEffect, useRef, useState } from "react";
import { getMasterShellMailbox346 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type MailboxReadout = {
  schema: "rosevear.ai-hub.ql455-owner-mailbox.v1";
  sourceBuild: 346;
  state: string;
  outboxEnrolled: false;
  inboxEnrolled: false;
  trustedTransportConfigured: false;
  durableReplayRuntimeVerified: false;
  signedRecipientAckRuntimeVerified: false;
  messageDelivered: false;
  crossAppConnectivityVerified: false;
  connection: "HOLD";
  incidentStatus: "OPEN_UNVERIFIED";
  physicalReceiverCurrentlyOff: false;
  activationAuthorized: false;
  closureAuthorized: false;
  originalHost: "DESKTOP-AE894KC";
  receiver: "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF";
  masterTheme: "rosevear-master-instrument.v1";
  handoffContractDigest: string;
  securityTiers: string[];
  applicationOrder: string[];
  nextMasterHandoff: "rosevear-comms-hub";
  message: string;
};

const order = ["ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
  "iCamp", "YW", "devilndove", "rosiedazzlers"];
const tiers = ["PUBLIC_READ", "USER_SCOPED", "TENANT_SCOPED", "OPERATOR_SCOPED",
  "MASTER_GOVERNANCE", "ORIGINAL_HOST_OWNER_CEREMONY"];

function trustworthy(data: unknown): MailboxReadout | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const r = data as Record<string, unknown>;
  if (r.schema !== "rosevear.ai-hub.ql455-owner-mailbox.v1" ||
      r.sourceBuild !== 346 || typeof r.state !== "string" ||
      r.outboxEnrolled !== false || r.inboxEnrolled !== false ||
      r.trustedTransportConfigured !== false ||
      r.durableReplayRuntimeVerified !== false ||
      r.signedRecipientAckRuntimeVerified !== false ||
      r.messageDelivered !== false || r.crossAppConnectivityVerified !== false ||
      r.connection !== "HOLD" || r.incidentStatus !== "OPEN_UNVERIFIED" ||
      r.physicalReceiverCurrentlyOff !== false ||
      r.activationAuthorized !== false || r.closureAuthorized !== false ||
      r.originalHost !== "DESKTOP-AE894KC" ||
      r.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      r.masterTheme !== "rosevear-master-instrument.v1" ||
      r.nextMasterHandoff !== "rosevear-comms-hub" ||
      typeof r.message !== "string" ||
      typeof r.handoffContractDigest !== "string" ||
      !/^[0-9a-f]{64}$/.test(r.handoffContractDigest) ||
      !Array.isArray(r.applicationOrder) ||
      r.applicationOrder.length !== order.length ||
      !order.every((id, i) => r.applicationOrder[i] === id) ||
      !Array.isArray(r.securityTiers) ||
      r.securityTiers.length !== tiers.length ||
      !tiers.every((id, i) => r.securityTiers[i] === id)) return null;
  return r as MailboxReadout;
}

export function Ql455OwnerMailboxPanel() {
  const [status, setStatus] = useState<MailboxReadout | null>(null);
  const [message, setMessage] = useState("Original seven-application mailbox is not enrolled.");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setStatus(null);
    setBusy(true);
    try {
      const response: unknown = await getMasterShellMailbox346(current.signal);
      if (controller.current !== current) return;
      const parsed = trustworthy(response);
      setStatus(parsed);
      setMessage(parsed ? parsed.message : "Invalid mailbox response: HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Mailbox unavailable: HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }
  return <MasterCommandVisualSystem
    title="Master Communications"
    subtitle="QL-455 local durable signed outbox, inbox, ACK and fail-closed recovery"
    release="346"
    currentPath="#ql455-mailbox"
    navigation={[{ id: "mailbox", label: "Protected mailbox readiness",
      href: "#ql455-mailbox" }]}
    kpis={status ? [
      { id: "mailbox", icon: "◉", label: "Live mailbox", value: "NOT ENROLLED",
        detail: "No delivered message", tone: "warning" },
      { id: "receiver", icon: "?", label: "Original receiver", value: "UNKNOWN",
        detail: "No fresh independent OFF witness", tone: "critical" },
    ] : []}
    workspaces={[]}>
    <section id="ql455-mailbox" className="mc-panel">
      <h3>Signed seven-application message custody</h3>
      <p>Protected local SQLite outbox and inbox, duplicate ID protection, bounded
        leasing, expiry rejection, dead letters and recipient-signed ACK verification.
        Nothing is transmitted by this status page. Original Windows safety remains HOLD.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading… " : "Refresh source readiness"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Protected outbox/inbox</dt><dd>NOT ENROLLED</dd>
        <dt>Durable replay and ACK runtime</dt><dd>NOT VERIFIED</dd>
        <dt>Master and business-app transport</dt><dd>NOT CONFIGURED</dd>
        <dt>Master theme</dt><dd>{status.masterTheme}</dd>
        <dt>Physical receiver</dt><dd>UNKNOWN / incident OPEN / activation DENIED</dd>
      </dl>}
      <h4>Canonical application handoff</h4>
      <ol>{order.map(id => <li key={id}>{id}</li>)}</ol>
      <p>iCamp and Yard Workers are Slave Shell applications; they retain their own
        themes. Devil n Dove and Rosie Dazzlers are independent internal businesses,
        not physical receiver authorities.</p>
    </section>
  </MasterCommandVisualSystem>;
}
