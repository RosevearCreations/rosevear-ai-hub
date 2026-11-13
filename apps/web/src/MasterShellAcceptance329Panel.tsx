import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance329 } from "./api";

type Ql438Status = {
  sourceBuild: 329;
  schema: string;
  connection: "HOLD";
  activationAuthorized: false;
  receiver: string;
  state: string;
  ql438OriginalHost: string;
  ql438IndependentOff: string;
  ql438ThirdReviewer: string;
  ql438ThreeMasters: string;
  ql438ExternalAnchor: string;
  ql438IndependentReader: string;
  ql438DualOwner: string;
  ql438PrivateClosure: string;
};

function isStatus(value: unknown): value is Ql438Status {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return item.sourceBuild === 329 &&
    item.schema === "rosevear.ai-hub.master360-ql438-corrective329.v1" &&
    item.connection === "HOLD" &&
    item.activationAuthorized === false &&
    item.receiver === "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION" &&
    [
      "state", "ql438OriginalHost", "ql438IndependentOff", "ql438ThirdReviewer",
      "ql438ThreeMasters", "ql438ExternalAnchor", "ql438IndependentReader",
      "ql438DualOwner", "ql438PrivateClosure",
    ].every((field) => typeof item[field] === "string");
}

/** Read-only owner-only display. Historical custody is not proof of current OFF. */
export function MasterShellAcceptance329Panel() {
  const [status, setStatus] = useState<Ql438Status | null>(null);
  const [message, setMessage] = useState("QL-438 signed corrective evidence not yet verified.");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    try {
      const value: unknown = await getMasterShellAcceptance329(current.signal);
      if (controller.current !== current) return;
      if (!isStatus(value)) {
        setStatus(null);
        setMessage("Owner-only QL-438 source status was unavailable or inconsistent. HOLD.");
        return;
      }
      setStatus(value);
      setMessage("Signed original-host evidence requires independent supervision. HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("QL-438 protected source status unavailable. HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-329-title">
    <p className="eyebrow">Build 329 · QL-438 protected corrective exception closure</p>
    <h3 id="master-329-title">Expired-lease remediation custody</h3>
    <p>Read-only owner view. No receiver activation or runtime state inference.
      Unknown physical OFF requires a fresh independently signed witness.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading source status…" : "Refresh QL-438 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Original-host signed corrective OFF</dt><dd>{status.ql438OriginalHost}</dd>
      <dt>Independent receiver OFF</dt><dd>{status.ql438IndependentOff}</dd>
      <dt>Third-party remediation witness</dt><dd>{status.ql438ThirdReviewer}</dd>
      <dt>Three signed Master reviews</dt><dd>{status.ql438ThreeMasters}</dd>
      <dt>External signed anchor</dt><dd>{status.ql438ExternalAnchor}</dd>
      <dt>Distinct signed anchor reader</dt><dd>{status.ql438IndependentReader}</dd>
      <dt>Dual signed owner closure</dt><dd>{status.ql438DualOwner}</dd>
      <dt>Protected one-use CLOSED custody</dt><dd>{status.ql438PrivateClosure}</dd>
      <dt>Live receiver</dt><dd>UNKNOWN — fresh independent verification required</dd>
      <dt>Connection / activation</dt><dd>HOLD / NOT AUTHORIZED</dd>
    </dl>}
  </section>;
}
