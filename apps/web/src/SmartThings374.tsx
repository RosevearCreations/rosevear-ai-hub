import { useEffect, useMemo, useState } from "react";
import {
  disconnectSmartThings374, getSmartThings374Report, inspectSmartThings374,
  reviewSmartThings374, type AuthRole, type SmartThings374Inspection,
  type SmartThings374Report,
} from "./api";

/** Private SmartThings inventory. No background polling, no vendor commands. */
export function SmartThings374({ role }: { role: AuthRole }) {
  const [report, setReport] = useState<SmartThings374Report | null>(null);
  const [inspection, setInspection] = useState<SmartThings374Inspection | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (role !== "owner") return;
    let active = true;
    void getSmartThings374Report().then(value => {
      if (active) setReport(value);
    }).catch(() => { if (active) setNotice("SmartThings report unavailable."); });
    return () => { active = false; };
  }, [role]);

  async function inspect() {
    setBusy(true);
    setInspection(null);
    setNotice("");
    try {
      const result = await inspectSmartThings374();
      setInspection(result);
      setReport(await getSmartThings374Report());
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "SmartThings inspection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, choice: "reviewed" | "excluded", revision: number) {
    if (!window.confirm(
      "Change " + id + " to " + choice + " in the Hub LOCAL review? " +
      "This does not modify Samsung settings, scopes, devices or automations."
    )) return;
    setBusy(true);
    try {
      await reviewSmartThings374({
        device_id: id, decision: choice,
        expected_revision: revision, owner_confirmed: true,
      });
      setInspection(null);
      setReport(await getSmartThings374Report());
      setNotice("Local decision saved. Re-inspect to compare current vendor inventory.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Owner review failed.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm(
      "Delete the LOCAL encrypted SmartThings token? It must ALSO be revoked at Samsung."
    )) return;
    setBusy(true);
    try {
      await disconnectSmartThings374({ owner_confirmed: true });
      setInspection(null);
      setReport(await getSmartThings374Report());
      setNotice("Local token deleted. Revoke it separately in Samsung SmartThings.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Local disconnect failed.");
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (inspection?.devices ?? []).filter(item =>
      !term || [item.name, item.locationName, item.roomName, item.deviceId]
        .some(value => value.toLowerCase().includes(term)));
  }, [inspection, search]);

  if (role !== "owner") return null;
  return <section className="panel" id="smartthings-374"
    aria-label="SmartThings source and permissions review">
    <header className="device-registry-heading">
      <div>
        <p className="eyebrow">Build 374 · Samsung SmartThings</p>
        <h2>Vendor devices, rooms &amp; scope review</h2>
        <p>One-shot Samsung read-only inventory and exact Home Assistant comparison.
          No provider account login, remote commands or automatic device adoption.</p>
      </div>
      <button type="button" disabled={busy || !report?.configured}
        onClick={() => void inspect()}>
        {busy ? "Inspecting…" : "Inspect SmartThings"}
      </button>
    </header>
    {notice && <p role="status" className="runtime-status">{notice}</p>}
    <p>Encrypted read credential: <strong>{report?.configured ?
      "configured (not yet validated)" : "not configured"}</strong> ·
      {" "}Source state: {report?.status.replaceAll("_", " ") ?? "unknown"} ·
      {" "}Last successful read: {report?.lastCheckedAt ?
      new Date(report.lastCheckedAt).toLocaleString() : "none"}</p>
    <p>To opt in later, place a temporary read-only Samsung token under
      {" "}<strong>Secrets → SmartThings read token</strong>.
      New personal tokens expire quickly. No token is needed for this code release.</p>
    <p><strong>Samsung OAuth installation, Android/Tizen device access and
      real physical state are not verified.</strong></p>
    {report?.configured && <button type="button" disabled={busy}
      onClick={() => void disconnect()}>Remove local SmartThings credential</button>}
    {!inspection ? <p role="status">No current Samsung readback displayed.
      A previous read is never evidence that SmartThings is connected now.</p> : <>
      <p role="status">Checked {new Date(inspection.checkedAt).toLocaleString()} ·
        {" "}{inspection.deviceCount} devices, {inspection.locationCount} locations,
        {" "}{inspection.roomCount} rooms · {inspection.exactHaCount} exact HA identities ·
        {" "}{inspection.nameOnlyCount} name-only candidates.</p>
      <p>HA reconciliation: {inspection.haState.replaceAll("_", " ")}.
        Name-only candidates are never automatically matched.</p>
      <label>Filter devices or rooms
        <input value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Device, room or location" />
      </label>
      <div role="region" aria-label="SmartThings read-only devices">
        {visible.slice(0, 100).map(item => <article className="panel" key={item.deviceId}>
          <h3>{item.name}</h3>
          <p>{item.locationName} · {item.roomName} · {item.vendorType}</p>
          <p>Vendor ID: <code>{item.deviceId}</code> · Exact HA ID:
            {" "}{item.exactHaId ?? "not verified"}</p>
          {item.repeatedName && <p role="alert">
            Repeated vendor name — verify exact device identity.</p>}
          {item.exactHaId === null && item.haNameCandidates > 0 &&
            <p>{item.haNameCandidates} unverified name-only HA candidate(s).</p>}
          <p>Local owner review: {item.localReview}</p>
          <button type="button" disabled={busy} onClick={() => void decide(
            item.deviceId, item.localReview === "reviewed" ? "excluded" : "reviewed",
            item.revision
          )}>{item.localReview === "reviewed" ?
            "Exclude locally" : "Mark locally reviewed"}</button>
        </article>)}
        {visible.length > 100 && <p>First 100 shown; narrow the filter.</p>}
      </div>
    </>}
    <p>Local exclusion is not Samsung permission revocation.
      Revoke provider access independently in the Samsung account.</p>
  </section>;
}
