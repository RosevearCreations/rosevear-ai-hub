import { useEffect, useRef, useState } from "react";
import { getMasterShellPolicy345 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

const apps = ["ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
  "iCamp", "YW", "devilndove", "rosiedazzlers"];
const tiers = ["PUBLIC_READ", "USER_SCOPED", "TENANT_SCOPED", "OPERATOR_SCOPED",
  "MASTER_GOVERNANCE", "ORIGINAL_HOST_OWNER_CEREMONY"];

type PolicyStatus = {
  sourceBuild: 345;
  policyDigest: string;
  applicationHandoffOrder: string[];
  securityTiers: string[];
  resourceMatrix: Record<string, Record<string, string>>;
  allApplicationsEnforcing: false;
  principalIssuerEnrollmentVerified: false;
  crossTenantRlsVerified: false;
  crossAppMessageDelivered: false;
  crossAppConnectivityVerified: false;
  receiver: "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF";
  incidentStatus: "OPEN";
  connection: "HOLD";
  activationAuthorized: false;
  closureAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  message: string;
};

function parse(value: unknown): PolicyStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  const order = p.applicationHandoffOrder;
  const levels = p.securityTiers;
  if (p.schema !== "rosevear.ai-hub.ql454-policy-registry.v1" ||
      p.sourceBuild !== 345 || p.connection !== "HOLD" ||
      p.incidentStatus !== "OPEN" ||
      p.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      p.activationAuthorized !== false || p.closureAuthorized !== false ||
      p.physicalReceiverCurrentlyOff !== false ||
      p.allApplicationsEnforcing !== false ||
      p.principalIssuerEnrollmentVerified !== false ||
      p.crossTenantRlsVerified !== false ||
      p.crossAppMessageDelivered !== false ||
      p.crossAppConnectivityVerified !== false ||
      !Array.isArray(order) || order.length !== apps.length ||
      !apps.every((item, i) => order[i] === item) ||
      !Array.isArray(levels) || levels.length !== tiers.length ||
      !tiers.every((item, i) => levels[i] === item) ||
      typeof p.policyDigest !== "string" ||
      !/^[0-9a-f]{64}$/.test(p.policyDigest) ||
      !p.resourceMatrix || typeof p.resourceMatrix !== "object" ||
      Array.isArray(p.resourceMatrix) ||
      typeof p.message !== "string") return null;
  const resources = p.resourceMatrix as Record<string, unknown>;
  if (Object.keys(resources).length !== apps.length ||
      !apps.every(app => resources[app] && typeof resources[app] === "object" &&
        !Array.isArray(resources[app]) &&
        Object.values(resources[app] as Record<string, unknown>).every(
          item => typeof item === "string" && tiers.includes(item)
        ))) return null;
  return p as PolicyStatus;
}

/** Policy registry only: no raw tokens, inputted principals or approval controls. */
export function Ql454OwnerPolicyPanel() {
  const [status, setStatus] = useState<PolicyStatus | null>(null);
  const [message, setMessage] = useState("QL-454 live issuer and resource enforcement not verified.");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function refresh() {
    active.current?.abort();
    const current = new AbortController();
    active.current = current;
    setBusy(true);
    setStatus(null);
    try {
      const response: unknown = await getMasterShellPolicy345(current.signal);
      if (active.current !== current) return;
      const parsed = parse(response);
      setStatus(parsed);
      setMessage(parsed ? parsed.message : "Untrusted QL-454 policy response: HOLD.");
    } catch {
      if (active.current !== current) return;
      setStatus(null);
      setMessage("QL-454 owner policy registry unavailable: HOLD.");
    } finally {
      if (active.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Security & Access"
    subtitle="QL-454 signed principal and six-tier resource boundary policy"
    release="345"
    currentPath="#ql454-policy"
    navigation={[{ id: "policy", label: "Read-only QL-454 policy",
      href: "#ql454-policy" }]}
    kpis={status ? [
      { id: "enforcement", icon: "⊘", label: "Live federation",
        value: "NOT VERIFIED", detail: "Source policy only", tone: "warning" },
      { id: "isolation", icon: "?", label: "Tenant RLS",
        value: "NOT VERIFIED", detail: "Per-app evidence needed", tone: "neutral" },
      { id: "receiver", icon: "⊘", label: "Original receiver",
        value: "UNKNOWN", detail: "No activation authority", tone: "critical" },
    ] : []}
    workspaces={[]}>
    <section id="ql454-policy" className="mc-panel">
      <h3>Signed scope policy — read-only owner registry</h3>
      <p>Source checks cover issuer and audience, identity and resource scope,
        exact user ownership, tenant isolation, operator-company boundaries,
        signed three-Master read-only governance and an absolute T5 refusal.
        Each application must separately bind resources to trusted database
        records and enforce role/tenant rules. This screen issues no permissions.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading policy…" : "Refresh QL-454 policy"}
      </button>
      <p role="status">{message}</p>
      {status && <>
        <p>Policy digest: <code>{status.policyDigest}</code></p>
        <h4>Canonical application resource classes</h4>
        <ul>{apps.map(app => <li key={app}>
          <strong>{app}:</strong> {Object.entries(status.resourceMatrix[app]).map(
            ([kind, tier]) => kind + " (" + tier + ")"
          ).join("; ")}
        </li>)}</ul>
        <h4>Six security tiers</h4>
        <ol>{tiers.map(tier => <li key={tier}>{tier}</li>)}</ol>
      </>}
      <p>Signed source evidence never proves physical OFF, incident closure,
        live connectivity, database tenant RLS or a delivered cross-app message.
        Original receiver UNKNOWN; incident OPEN; all activation on HOLD.</p>
    </section>
  </MasterCommandVisualSystem>;
}
