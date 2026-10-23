import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { getHomeAssistantBrowser, type HomeAssistantBrowserResponse } from "./api";
import {
  assessHADiscovery,
  createHADiscoveryReceipt,
  importHAPriorEvidence,
  type HAReviewMark,
  type HAPriorEvidence,
  type IntegrationObservation,
} from "./homeAssistantDiscovery";
import { validateOwnerIntegrationName } from "./deviceRecoveryFollowUps";

type CurrentReading = { browser: HomeAssistantBrowserResponse; observedAt: string };
const observationLabels: Record<IntegrationObservation, string> = {
  unchecked: "Not checked in Home Assistant",
  visible: "Integration entry visible (owner checked)",
  attention: "Integration needs attention",
  absent: "Integration entry not found",
};

/** Read-only owner workbench. Reads are explicit, review state is session-only and refresh invalidates all marks. */
export function HomeAssistantDiscoveryPanel() {
  const [prior, setPrior] = useState<HAPriorEvidence | null>(null);
  const [reading, setReading] = useState<CurrentReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [marks, setMarks] = useState<Record<string, HAReviewMark>>({});
  const [observations, setObservations] = useState<Record<string, IntegrationObservation>>({});
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => () => inflight.current?.abort(), []);

  const assessment = useMemo(() => prior && reading
    ? assessHADiscovery(prior, reading.browser, reading.observedAt, marks, observations) : null,
  [prior, reading, marks, observations]);
  const canReview = Boolean(assessment?.later && assessment.fresh);
  const groups = [...new Set(assessment?.rows.map((row) => row.integrationGroup).filter((group): group is string => Boolean(group)) ?? [])].sort();

  function reset() {
    setSelected([]);
    setMarks({});
    setObservations({});
  }

  async function importPrior(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    inflight.current?.abort();
    inflight.current = null;
    setBusy(false);
    setReading(null);
    reset();
    try {
      if (file.size > 1_000_000) throw new Error("Private evidence exceeds the 1 MB limit.");
      const evidence = importHAPriorEvidence(await file.text());
      setPrior(evidence);
      setMessage(`Imported ${evidence.identities.length} HA identities. Take a new live registry reading; prior acceptances are not inherited.`);
    } catch (error) {
      setPrior(null);
      setMessage(error instanceof Error ? error.message : "Unable to read prior HA evidence.");
    }
  }

  async function refresh() {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setReading(null);
    reset();
    setMessage("");
    setBusy(true);
    try {
      const browser = await getHomeAssistantBrowser(controller.signal);
      if (controller.signal.aborted) return;
      setReading({ browser, observedAt: new Date().toISOString() });
      setMessage("Authenticated HA registry read. A registered device is not proof it works physically.");
    } catch {
      if (!controller.signal.aborted) setMessage("Home Assistant registry could not be read. Device counts are unknown; no empty-inventory conclusion is permitted.");
    } finally {
      if (inflight.current === controller) {
        inflight.current = null;
        setBusy(false);
      }
    }
  }

  function isCurrentFresh() {
    if (!prior || !reading) return false;
    const age = Date.now() - Date.parse(reading.observedAt);
    return Number.isFinite(age) && age >= -60_000 && age <= 300_000 &&
      Date.parse(reading.observedAt) > Date.parse(prior.sourceAt);
  }

  function assignGroup() {
    if (!canReview || !isCurrentFresh() || selected.length === 0) {
      setMessage("The HA registry reading has expired. Recheck before grouping identities.");
      return;
    }
    try {
      const group = validateOwnerIntegrationName(groupName);
      setMarks((previous) => {
        const next = { ...previous };
        for (const key of selected) next[key] = { group, verifiedFunction: false };
        return next;
      });
      setSelected([]);
      setGroupName("");
      setMessage(`Assigned ${selected.length} identities to owner-confirmed group “${group}”. This label does not prove an HA integration is installed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid HA integration group.");
    }
  }

  function exportReceipt() {
    if (!prior || !reading || !assessment || !canReview || !isCurrentFresh()) {
      setMessage("Recheck a later, fresh HA registry before exporting private evidence.");
      return;
    }
    try {
      const currentAssessment = assessHADiscovery(prior, reading.browser, reading.observedAt, marks, observations);
      const packet = createHADiscoveryReceipt(prior, currentAssessment, reading.observedAt);
      const url = URL.createObjectURL(new Blob([`${JSON.stringify(packet, null, 2)}\n`], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-ha-integration-diagnosis-${reading.observedAt.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Private diagnostic receipt downloaded. Physical acceptance remains held pending supervised verification.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to export diagnostic receipt.");
    }
  }

  return (
    <section className="panel recovery-inventory" aria-label="Build 114 Home Assistant integration discovery and missing device diagnosis">
      <div className="ha-section-heading">
        <div>
          <p className="eyebrow">Build 114 · Owner-supervised, read-only</p>
          <h2>Home Assistant integration & missing device diagnosis</h2>
          <p>Match prior exact device/entity IDs against a new authenticated HA registry reading. Integration platform names are hints; only we can confirm the actual integration in Home Assistant.</p>
        </div>
        <button type="button" disabled={busy || !prior} onClick={() => void refresh()}>{busy ? "Reading…" : "Read fresh HA registry"}</button>
      </div>
      <label className="recovery-receipt-upload">
        Import Build 107 inventory or Build 110 missing-device follow-up JSON (kept on this device)
        <input aria-label="Choose prior HA inventory or worklist JSON" type="file" accept=".json,application/json" onChange={(event) => void importPrior(event)} />
      </label>
      {message && <p role="status">{message}</p>}
      {!prior && <p role="note">Start with a privately exported earlier snapshot or follow-up worklist. No discovery, pairing or integration repair starts automatically.</p>}
      {prior && <p>{prior.identities.length} prior HA identities · source {prior.sourceAt}. Camera entries are excluded.</p>}
      {prior && !reading && <p role="note">Current HA inventory unknown until its authenticated registry returns. A failed read does not mean zero devices.</p>}
      {assessment && (
        <>
          {(!assessment.later || !assessment.fresh) && (
            <p className="connection-guidance" role="alert">A strictly later, five-minute-fresh registry reading is needed before owner review or export. Recheck from the installed Hub.</p>
          )}
          <div className="recovery-evidence-grid">
            <div><h3>Exact-ID status</h3><p>{assessment.counts.absent} missing · {assessment.counts.unavailable} unavailable/unknown · {assessment.counts.reported} reported</p></div>
            <div><h3>Field acceptance</h3><p>{assessment.counts.openHolds} open holds · {assessment.counts.ownerObserved} owner checks this session (not independent certification)</p></div>
          </div>
          <details>
            <summary>Current integration platform hints ({assessment.platforms.length})</summary>
            <p>Platforms are reported by currently active HA entity registry/state records. Disabled, removed or undiscovered integrations might not appear here.</p>
            <ul>{assessment.platforms.map((item) => <li key={item.platform}><code>{item.platform}</code>: {item.entities} current entities, {item.unavailable} unavailable/unknown</li>)}</ul>
          </details>
          {assessment.rows.length > 0 && (
            <>
              <div className="recovery-evidence-actions">
                <button type="button" disabled={!canReview} onClick={() => setSelected(assessment.rows.map((row) => row.key))}>Select all HA identities</button>
                <label>Owner-confirmed integration name
                  <input type="text" maxLength={64} value={groupName} placeholder="e.g. MQTT or Meross" onChange={(event) => setGroupName(event.target.value)} />
                </label>
                <button type="button" disabled={!canReview || selected.length === 0} onClick={assignGroup}>Group {selected.length} selected</button>
              </div>
              {groups.map((group) => (
                <label key={group} className="recovery-playback-mark">Integration {group}:
                  <select aria-label={`Owner HA integration check for ${group}`} disabled={!canReview} value={observations[group] ?? "unchecked"}
                    onChange={(event) => {
                      if (!isCurrentFresh()) {
                        setMessage("Registry reading expired; recheck before changing integration observations.");
                        return;
                      }
                      const value = event.target.value as IntegrationObservation;
                      setObservations((old) => ({ ...old, [group]: value }));
                      // A changed integration finding invalidates any prior function acknowledgement.
                      setMarks((old) => Object.fromEntries(Object.entries(old).map(([key, mark]) => [
                        key, mark.group === group ? { ...mark, verifiedFunction: false } : mark,
                      ])));
                    }}>
                    {Object.entries(observationLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>
              ))}
              <div className="recovery-review-list">
                {assessment.rows.slice(0, 100).map((row) => (
                  <div className="recovery-review-item recovery-follow-up-item" key={row.key}>
                    <label className="recovery-playback-mark">
                      <input type="checkbox" aria-label={`Select HA group for ${row.name}`} disabled={!canReview} checked={selected.includes(row.key)}
                        onChange={(event) => setSelected((old) => event.target.checked ? [...new Set([...old, row.key])] : old.filter((key) => key !== row.key))} />Group
                    </label>
                    <span>
                      <strong>{row.name}</strong>
                      <small>{row.source} · <code>{row.id}</code> · {row.state} · Group: {row.integrationGroup ?? "unconfirmed"}</small>
                      <small>Live HA platform hint: {row.platformHint ?? "unknown (do not infer ownership)"}</small>
                      <small>Next: {row.nextStep}</small>
                    </span>
                    <label className="recovery-playback-mark">
                      <input type="checkbox" aria-label={`Verified HA physical function for ${row.name}`}
                        disabled={!canReview || row.state !== "reported" || row.integrationObservation !== "visible"}
                        checked={canReview && row.ownerObservedFunction}
                        onChange={(event) => {
                          if (!isCurrentFresh()) {
                            setMessage("The HA reading has expired. Recheck before acknowledging a real device function.");
                            return;
                          }
                          setMarks((old) => ({ ...old, [row.key]: {
                            group: row.integrationGroup ?? "", verifiedFunction: event.target.checked,
                          } }));
                        }} />I tested this exact device/entity function in HA now
                    </label>
                  </div>
                ))}
              </div>
              {assessment.rows.length > 100 && <p>Showing first 100; export includes all {assessment.rows.length} identities.</p>}
            </>
          )}
          <button type="button" disabled={!canReview} onClick={exportReceipt}>Download private HA diagnosis & unresolved holds</button>
          <p role="note" className="connection-guidance">Next supervised steps: Home Assistant → Settings → Devices & services → select integration → inspect diagnostics, devices and entities; check physical power/network. Never click reconfigure, reload, repair or add integration blindly. This panel performs no enrollment, actions, restarts or database restoration. CI GREEN is separate from field recovery.</p>
        </>
      )}
    </section>
  );
}
