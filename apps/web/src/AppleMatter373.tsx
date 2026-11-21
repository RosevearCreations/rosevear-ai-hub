import { useEffect, useMemo, useState } from "react";
import {
  getAppleMatter373Report, inspectAppleMatter373, reviewAppleMatter373,
  type AppleMatter373Inspection, type AppleMatter373Report, type AuthRole,
} from "./api";

/** Owner-only local inventory review; never initiates Apple/Matter pairing. */
export function AppleMatter373({ role }: { role: AuthRole }) {
  const [report, setReport] = useState<AppleMatter373Report | null>(null);
  const [inspection, setInspection] = useState<AppleMatter373Inspection | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (role !== "owner") return;
    let active = true;
    void getAppleMatter373Report().then(value => {
      if (active) setReport(value);
    }).catch(() => { if (active) setMessage("Local Apple/Matter review unavailable."); });
    return () => { active = false; };
  }, [role]);

  async function inspect() {
    setBusy(true);
    setMessage("");
    setInspection(null);
    try {
      setInspection(await inspectAppleMatter373());
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "HA inventory unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(deviceId: string, decision: "reviewed" | "revoked", revision: number) {
    const prompt = decision === "reviewed"
      ? "Mark this Home Assistant device as locally reviewed? This does not pair, expose, or control it."
      : "Revoke local review? This does NOT unpair the device in Home Assistant or Apple Home.";
    if (!window.confirm(prompt)) return;
    setBusy(true);
    try {
      await reviewAppleMatter373({
        device_id: deviceId, decision, expected_revision: revision, owner_confirmed: true,
      });
      setInspection(null);
      setReport(await getAppleMatter373Report());
      setMessage("Local owner review saved; Home Assistant and Apple pairing unchanged.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Review failed; inspect again.");
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (inspection?.items ?? []).filter(item =>
      !needle || [item.deviceId, item.name, item.areaId, item.kind]
        .some(value => value.toLowerCase().includes(needle)));
  }, [inspection, search]);

  if (role !== "owner") return null;
  return <section className="panel" aria-label="Apple Home and Matter source review"
    id="apple-matter-373">
    <header className="device-registry-heading">
      <div>
        <p className="eyebrow">Build 373 · Apple Home / HomeKit / Matter</p>
        <h2>Private device inventory &amp; pairing custody</h2>
        <p>Read Home Assistant registry references for Matter and HomeKit devices.
          No Apple account connection, pairing PIN, bridge export, device command or
          network discovery is performed.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void inspect()}>
        {busy ? "Inspecting…" : "Inspect HA registry"}
      </button>
    </header>
    <p>Local reviewed identities: {report?.reviews.filter(x => x.decision === "reviewed").length ?? "—"}.
      A local review is not evidence of Apple Home visibility or Matter commissioning.</p>
    {message && <p className="runtime-status" role="status">{message}</p>}
    {!inspection ? <p role="status">Live HA device registry not inspected for this view.
      Pairing and Apple Home exposure are on field HOLD.</p> : <>
      <p role="status">Checked {new Date(inspection.checkedAt).toLocaleString()} ·
        {" "}{inspection.count} possible HomeKit/Matter device references ·
        {" "}{inspection.possibleDuplicateNames} entries with repeated names.
      </p>
      <p><strong>Bridge pairing, Apple Home visibility and Matter commissioning:
        unverified.</strong> A Home Assistant registry entry alone cannot prove them.</p>
      <label>Search device or room
        <input value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Device, type, room or HA ID" />
      </label>
      <div role="region" aria-label="HA Apple/Matter candidates">
        {visible.slice(0, 100).map(item => <article className="panel" key={item.deviceId}>
          <h3>{item.name}</h3>
          <p>{item.kind.replaceAll("_", " ")} · HA device <code>{item.deviceId}</code> ·
            {" "}Area {item.areaId || "unknown"}</p>
          <p>Source markers: {item.sourceDomains.join(", ")} ·
            {" "}Local review: {item.localReview}</p>
          {item.possibleDuplicateName && <p role="alert">Repeated name: manually confirm identity.</p>}
          {item.localReview !== "reviewed" ?
            <button type="button" disabled={busy}
              onClick={() => void decide(item.deviceId, "reviewed", item.revision)}>
              Mark locally reviewed
            </button> :
            <button type="button" disabled={busy}
              onClick={() => void decide(item.deviceId, "revoked", item.revision)}>
              Revoke local review
            </button>}
        </article>)}
        {visible.length > 100 && <p>Showing first 100 results; narrow the search.</p>}
      </div>
      <p>HomeKit Bridge may be configured without a HA device entry.
        Verify actual bridge settings, pairing custody, iOS permissions and
        Thread border-router health separately in Home Assistant and Apple Home.</p>
    </>}
  </section>;
}
