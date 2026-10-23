import { useMemo, useState, type ChangeEvent } from "react";

import { closureKey, parseClosureLedger, parseRecoveryWorklist, type ClosureLedger, type FollowUpWorklist } from "./deviceRecoveryClosure";
import { compareClosureHistory, createDriftHandoff } from "./deviceRecoveryDrift";

/** A historical, private evidence handoff. Does not fetch devices or alter integrations/cameras. */
export function DeviceCameraDriftPanel() {
  const [worklist, setWorklist] = useState<FollowUpWorklist | null>(null);
  const [ledger, setLedger] = useState<ClosureLedger | null>(null);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const result = useMemo(() => worklist && ledger ? compareClosureHistory(worklist, ledger) : null, [worklist, ledger]);
  const open = useMemo(() => result?.items.filter((item) => item.current_status === "open_hold") ?? [], [result]);
  const openKeys = useMemo(() => new Set(open.map((item) => closureKey(item.source, item.id))), [open]);
  const acknowledged = reviewed.filter((key) => openKeys.has(key));

  async function importWorklist(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("Build 110 worklist exceeds 1 MB.");
      const imported = parseRecoveryWorklist(await file.text());
      setWorklist(imported);
      setLedger(null);
      setReviewed([]);
      setMessage("Build 110 worklist loaded. Next import the matching Build 111 ledger.");
    } catch (error) {
      setWorklist(null);
      setLedger(null);
      setReviewed([]);
      setMessage(error instanceof Error ? error.message : "Unable to import the follow-up worklist.");
    }
  }

  async function importLedger(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !worklist) return;
    try {
      if (file.size > 1_000_000) throw new Error("Build 111 closure ledger exceeds 1 MB.");
      const imported = parseClosureLedger(await file.text(), worklist);
      setLedger(imported);
      setReviewed([]);
      setMessage("Private Build 111 evidence chain loaded. These are historical owner assertions, not live device checks.");
    } catch (error) {
      setLedger(null);
      setReviewed([]);
      setMessage(error instanceof Error ? error.message : "Unable to import the closure ledger.");
    }
  }

  function exportHandoff() {
    if (!worklist || !ledger || !result) return;
    try {
      const handoff = createDriftHandoff(worklist, ledger, result, new Set(acknowledged));
      const href = URL.createObjectURL(new Blob([`${JSON.stringify(handoff, null, 2)}\n`], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `rosevear-supervised-field-recheck-handoff-${result.latest_registry_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      setMessage("Private historical handoff downloaded. Review marks acknowledge the handoff only; no device, camera or integration was repaired.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to export the historical handoff.");
    }
  }

  return (
    <section className="recovery-field-review" aria-label="Build 112 supervised field recheck drift and evidence chain handoff">
      <h3>Build 112 — Field recheck drift and private evidence handoff</h3>
      <p>Import the same Build 110 worklist and latest matching Build 111 closure ledger. Compare the last two owner reviews, identify reopens and holds, and download a private handoff. These files are historical notes, not a live health probe or proof of physical repairs.</p>
      <label className="recovery-receipt-upload">
        Import Build 110 worklist for evidence lineage
        <input type="file" accept=".json,application/json" aria-label="Choose Build 110 worklist for drift review" onChange={(event) => void importWorklist(event)} />
      </label>
      {worklist && <label className="recovery-receipt-upload">
        Import matching Build 111 closure ledger
        <input type="file" accept=".json,application/json" aria-label="Choose Build 111 closure ledger for drift review" onChange={(event) => void importLedger(event)} />
      </label>}
      {message && <p role="status">{message}</p>}
      {result && (
        <>
          <p role="note">Historical evidence only: {result.review_count} owner review{result.review_count === 1 ? "" : "s"}, most recent registry <strong>{result.latest_registry_at}</strong>, owner review <strong>{result.latest_review_at}</strong>. {result.previous_review_at ? `Compared with ${result.previous_review_at}.` : "First review only: no earlier review to compare."}</p>
          <div className="recovery-evidence-grid">
            <div><h4>Outstanding field holds</h4><p>{result.summary.unresolved} open · {result.summary.unresolved_ha} HA identities · {result.summary.unresolved_camera} cameras</p></div>
            <div><h4>Changes in owner evidence</h4><p>{result.summary.reopened} reopened · {result.summary.still_open} still open · {result.summary.newly_closed} newly closed · {result.summary.rechecked_closed} rechecked closed</p></div>
          </div>
          <p>{result.summary.stage_changed} cases changed their review stage. {acknowledged.length} of {open.length} outstanding handoff items reviewed in this session.</p>
          {open.length === 0 ? <p>No open holds in the last owner ledger. This is not independent proof that our actual devices and cameras work.</p> : (
            <div className="recovery-review-list">
              {open.slice(0, 100).map((item) => {
                const key = closureKey(item.source, item.id);
                return (
                  <div key={key} className="recovery-review-item recovery-follow-up-item">
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.source} · <code>{item.id}</code>{item.integration_group_owner_supplied ? ` · Owner group: ${item.integration_group_owner_supplied}` : ""}</small>
                      <small>{item.stage} · {item.drift}{item.stage_changed ? ` · changed from ${item.prior_stage}` : ""}</small>
                      <small>Next: {item.source === "hub_camera" ? item.stage === "camera_registration" ? "Review discovery and explicit camera registration." : item.stage === "camera_stream" ? "Inspect private go2rtc and fresh stream health." : "Watch moving live video before any new closure." : item.stage === "ha_integration" ? "Check HA integration, device power and network." : "Test the actual HA function."}</small>
                    </span>
                    <label className="recovery-playback-mark">
                      <input type="checkbox" aria-label={`Reviewed handoff: ${item.name}`} checked={acknowledged.includes(key)}
                        onChange={(event) => setReviewed((prior) => event.target.checked
                          ? [...new Set([...prior, key])] : prior.filter((value) => value !== key))} />
                      I reviewed this handoff item, not the physical device
                    </label>
                  </div>
                );
              })}
              {open.length > 100 && <p>Showing 100 of {open.length} open holds; the private download retains all unresolved identities.</p>}
            </div>
          )}
          <details>
            <summary>Owner evidence chain ({result.review_count} recorded reviews)</summary>
            <ol>{ledger?.entries.map((entry) => <li key={entry.registry_at}>Registry {entry.registry_at} · owner review {entry.reviewed_at} · {entry.summary.open_holds} open · {entry.summary.owner_attested_closed} owner-attested closed · {entry.summary.reopened} reopened</li>)}</ol>
          </details>
          <button type="button" onClick={exportHandoff}>Download private field recheck and evidence chain handoff</button>
          <p className="connection-guidance">No stream URL, token, password, raw provider response or device telemetry is exported. The chain is a chronological summary of owner-authored records, not a digital signature or independently verified attestation. Any real HA restoration or camera action remains a separate supervised step.</p>
        </>
      )}
    </section>
  );
}
