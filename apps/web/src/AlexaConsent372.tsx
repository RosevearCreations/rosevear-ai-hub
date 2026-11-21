import { useEffect, useMemo, useState } from "react";
import {
  getAlexaConsent372Report, inspectAlexaConsent372, reviewAlexaConsent372,
  getAlexaConsent372Audit, type AlexaConsent372Inspection,
  type AlexaConsent372Audit, type AlexaConsent372LocalReport,
  type AuthRole,
} from "./api";

/** HA voice-assistant settings vs owner intent; no Alexa skill/account writes. */
export function AlexaConsent372({ role }: { role: AuthRole }) {
  const [local, setLocal] = useState<AlexaConsent372LocalReport | null>(null);
  const [inspection, setInspection] = useState<AlexaConsent372Inspection | null>(null);
  const [audit, setAudit] = useState<AlexaConsent372Audit | null>(null);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState("all");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    setBusy(true);
    try {
      const [report, events] = await Promise.all([
        getAlexaConsent372Report(), getAlexaConsent372Audit(),
      ]);
      setLocal(report);
      setAudit(events);
      setNotice("");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Alexa review unavailable.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (role === "owner") void load(); }, [role]);

  async function inspect() {
    setBusy(true);
    setNotice("");
    setInspection(null);
    try {
      setInspection(await inspectAlexaConsent372());
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Home Assistant Alexa readback unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(entityId: string, decision: "approved" | "revoked", revision: number) {
    const message = decision === "approved"
      ? `Approve a 30-day LOCAL review of ${entityId}? This will NOT expose it in Home Assistant or Alexa. We must complete HA exposure separately.`
      : `Revoke the local approval of ${entityId}? If HA already exposes it, we must also unexpose it in Home Assistant.`;
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      await reviewAlexaConsent372({
        entity_id: entityId, decision, expected_revision: revision, owner_confirmed: true,
      });
      setInspection(null);
      const [report, events] = await Promise.all([
        getAlexaConsent372Report(), getAlexaConsent372Audit(),
      ]);
      setLocal(report);
      setAudit(events);
      setNotice("Owner intent saved locally. Reinspect HA; provider exposure is unchanged.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Owner review failed; refresh.");
    } finally {
      setBusy(false);
    }
  }

  const items = useMemo(() => {
    if (!inspection) return [];
    return inspection.items.filter(item => {
      const needle = search.trim().toLowerCase();
      if (show === "drift" && item.drift !== "EXPOSED_WITHOUT_CURRENT_APPROVAL") return false;
      if (show === "eligible" && !item.eligible) return false;
      if (show === "exposed" && !item.haAlexaExposed) return false;
      return !needle || [item.entityId, item.name, item.areaId].some(value =>
        value.toLowerCase().includes(needle));
    });
  }, [inspection, search, show]);

  if (role !== "owner") return null;
  return <section className="panel" id="alexa-consent-372"
    aria-label="Alexa exposure and consent reconciliation">
    <header className="device-registry-heading">
      <div>
        <p className="eyebrow">Build 372 · Alexa voice privacy &amp; reviewed discovery</p>
        <h2>Alexa exposure review</h2>
        <p>Compare actual Home Assistant Alexa exposure settings with our approved list. No account
          linking, voice recordings, provider changes or automatic device adoption occur here.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void inspect()}>
        {busy ? "Checking…" : "Inspect HA settings"}
      </button>
    </header>
    {notice && <p role="status" className="runtime-status">{notice}</p>}
    <p>Local owner approvals: {local?.consents.filter(x => x.effectiveApproval).length ?? "—"}.
      {" "}Each expires after 30 days. Approval is a planning permission only, not proof of voice access.</p>
    {!inspection ? <p role="status">Home Assistant Alexa settings are not verified for this view.
      Press Inspect HA settings to check the current exposed list; no devices are changed.</p> : <>
      <p role="status">
        HA setting read at {new Date(inspection.checkedAt).toLocaleString()} ·
        {" "}{inspection.readbackCount} HA entities checked ·
        {" "}{inspection.driftCount} without valid review or missing from inventory
      </p>
      {inspection.automaticExposureEnabled && <p role="alert">
        Attention: Home Assistant reports Alexa automatic exposure of new entities ENABLED.
        Disable it under Settings → Voice assistants → Alexa before broadening device discovery.
      </p>}
      <p>Amazon skill linked: <strong>unverified</strong> · Voice invocation audit: <strong>not available</strong>.
        Only HA settings are read; a working voice connection cannot be inferred.</p>
      <div className="device-registry-filters">
        <label>Find device<input value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Room, name or entity ID" /></label>
        <label>Show<select value={show} onChange={event => setShow(event.target.value)}>
          <option value="all">All HA entities</option>
          <option value="drift">Unexpected exposure</option>
          <option value="eligible">Eligible lights</option>
          <option value="exposed">Currently exposed in HA</option>
        </select></label>
      </div>
      {inspection.exposedWithoutInventory.length > 0 && <div role="alert">
        <strong>{inspection.exposedWithoutInventory.length} Alexa-exposed IDs absent from the HA registry:</strong>
        <ul>{inspection.exposedWithoutInventory.map(id => <li key={id}><code>{id}</code></li>)}</ul>
        Review these manually in Home Assistant; no automatic removal is performed.
      </div>}
      <div role="region" aria-label="Alexa candidate device review">
        {items.slice(0, 100).map(item => <article className="panel" key={item.entityId}>
          <h3>{item.name}</h3>
          <p><code>{item.entityId}</code> · Area: {item.areaId || "Unknown"}</p>
          <p>HA Alexa exposure: <strong>{item.haAlexaExposed ? "EXPOSED" : "not listed"}</strong> ·
            {" "}Owner review: {item.desiredApproved ? "approved" : "not approved"} ·
            {" "}{item.drift.replaceAll("_", " ").toLowerCase()}</p>
          {!item.eligible && <p>Blocked from approval: {item.reason}</p>}
          {item.eligible && !item.desiredApproved && <button type="button" disabled={busy}
            onClick={() => void decide(item.entityId, "approved", item.revision)}>
            Review safe light for Alexa
          </button>}
          {item.desiredApproved && <button type="button" disabled={busy}
            onClick={() => void decide(item.entityId, "revoked", item.revision)}>
            Revoke local review
          </button>}
          {item.haAlexaExposed && !item.desiredApproved && <p role="alert">
            Not approved in Hub. Use Home Assistant Voice assistants → Alexa → Unexpose
            to stop the actual provider exposure.
          </p>}
        </article>)}
        {items.length > 100 && <p>Showing first 100 of {items.length}. Narrow search to review more.</p>}
      </div>
    </>}
    <details>
      <summary>Owner review history (not spoken-command history)</summary>
      <ul>{audit?.events.map((event, index) => <li key={index}>
        {new Date(event.at).toLocaleString()}: {event.decision} · {event.entityId}
      </li>)}</ul>
    </details>
    <p>For genuine voice use, connect Alexa through Home Assistant’s supported integration,
      enable the Home Assistant skill in the Alexa app, and expose only owner-reviewed lights.
      Reinspect after each change; this panel does not control Amazon or Home Assistant.</p>
  </section>;
}
