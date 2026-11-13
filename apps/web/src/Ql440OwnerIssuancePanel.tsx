import { useEffect, useRef, useState } from "react";
import { getMasterShellIssuance331 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type Source331 = {
  sourceBuild: 331;
  schema: "rosevear.ai-hub.ql440-owner-source.v1";
  state: "QL440_DURABLE_PRIVATE_ISSUANCE_NEW_OFF_AND_OWNER_CHALLENGE_REQUIRED";
  connection: "HOLD";
  activationAuthorized: false;
  ceremonyAuthorizationIssued: false;
  receiver: "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION";
  message: string;
};

function safeStatus(data: unknown): data is Source331 {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const item = data as Record<string, unknown>;
  return item.sourceBuild === 331 &&
    item.schema === "rosevear.ai-hub.ql440-owner-source.v1" &&
    item.state === "QL440_DURABLE_PRIVATE_ISSUANCE_NEW_OFF_AND_OWNER_CHALLENGE_REQUIRED" &&
    item.connection === "HOLD" && item.activationAuthorized === false &&
    item.ceremonyAuthorizationIssued === false &&
    item.receiver === "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION" &&
    typeof item.message === "string";
}

/** No challenge issuance or receiver mutation from the browser. */
export function Ql440OwnerIssuancePanel() {
  const [status, setStatus] = useState<Source331 | null>(null);
  const [message, setMessage] = useState("QL-440 protected source not yet retrieved.");
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function refresh() {
    active.current?.abort();
    const current = new AbortController();
    active.current = current;
    setStatus(null);
    setLoading(true);
    try {
      const data: unknown = await getMasterShellIssuance331(current.signal);
      if (active.current !== current) return;
      if (!safeStatus(data)) {
        setMessage("Invalid or unverified issuance source. Remain on HOLD.");
        return;
      }
      setStatus(data);
      setMessage(data.message);
    } catch {
      if (active.current !== current) return;
      setMessage("Protected QL-440 owner source unavailable. HOLD.");
    } finally {
      if (active.current === current) setLoading(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Original-host challenge issuance"
    subtitle="QL-440 signed challenge-only authority — read-only"
    release="331"
    currentPath="#ql440-owner-status"
    navigation={[{ id: "issue", label: "Issuance evidence", href: "#ql440-owner-status" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection", value: status.connection,
        detail: "No Master connected state verified", tone: "warning" },
      { id: "issuance", icon: "⊘", label: "Challenge authority", value: "NOT ISSUED",
        detail: "No signed protected original-host source", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "Fresh independent OFF witness required", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql440-owner-status" className="mc-panel">
      <h3>Original-host signed issuance custody</h3>
      <p>Read-only historical status. Signing and receiver ON controls are not present.</p>
      <button type="button" disabled={loading} onClick={() => void refresh()}>
        {loading ? "Reading protected status…" : "Refresh authenticated issuance status"}
      </button>
      <p role="status">{message}</p>
    </section>
  </MasterCommandVisualSystem>;
}
