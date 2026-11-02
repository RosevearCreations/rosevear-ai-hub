import { useState } from "react";

import { CardHelp, type ShellDensity, type ShellTheme } from "./CommandShell";
import { EMPTY_OWNER_VIEWS, ownerPreferenceKey, parseOwnerPreferences, saveOwnerView,
  type OwnerPreferenceDocument, type SavedOwnerView } from "./ownerPreferences";

const startSections: SavedOwnerView["startSection"][] = ["Home", "System", "Devices", "Cameras", "Workshop", "Search & Help"];

export function OwnerPreferencesPanel({ ownerId, density, theme, onApply }: {
  ownerId: number; density: ShellDensity; theme: ShellTheme; onApply: (view: SavedOwnerView) => void;
}) {
  const [doc, setDoc] = useState<OwnerPreferenceDocument>(() => {
    try { return parseOwnerPreferences(localStorage.getItem(ownerPreferenceKey(ownerId)) ?? "", ownerId); }
    catch { return EMPTY_OWNER_VIEWS(ownerId); }
  });
  const [name, setName] = useState("");
  const [startSection, setStartSection] = useState<SavedOwnerView["startSection"]>("Home");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");

  function persist(next: OwnerPreferenceDocument) {
    try {
      localStorage.setItem(ownerPreferenceKey(ownerId), JSON.stringify(next));
      setDoc(next);
      setMessage("Display preferences saved locally for this owner account.");
    } catch { setMessage("Local storage unavailable. No preferences were saved."); }
  }

  function addView() {
    try {
      const current = name.trim();
      if (!current) throw new Error("Enter a view name.");
      persist(saveOwnerView(doc, { name: current, density, theme, startSection }));
      setName("");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to save view."); }
  }

  function exportViews() {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "rosevear-hub-display-preferences.json"; anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Display preferences exported. No account secrets or acceptance receipts included.");
  }

  function importViews() {
    try {
      const next = parseOwnerPreferences(importText, ownerId);
      persist(next);
      setImportText("");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Import rejected."); }
  }

  function clearViews() {
    persist(EMPTY_OWNER_VIEWS(ownerId));
    setMessage("Saved display views cleared. No audit, security or owner acceptance records changed.");
  }

  return <section className="panel hub-owner-preferences" aria-labelledby="hub-owner-preferences-title">
    <header className="hub-search-header">
      <div><p className="eyebrow">Build 223 · display settings only</p><h2 id="hub-owner-preferences-title">Owner preferences &amp; saved views</h2></div>
      <CardHelp title="Preferences safety">Saved views store only a name, density, contrast and start screen. They belong to this owner on this browser. Imports reject other owners, unknown versions and extra fields. No secrets, credentials, security decisions or acceptance receipts are saved.</CardHelp>
    </header>
    <p>Save the current Standard/high-contrast theme and interface density with a preferred start screen. Apply a view when needed. This does not change other users' settings or run device actions.</p>
    <div className="hub-owner-preferences-editor">
      <label htmlFor="hub-view-name">Saved view name</label>
      <input id="hub-view-name" maxLength={48} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Morning systems review" />
      <label htmlFor="hub-view-start">Start screen for this view</label>
      <select id="hub-view-start" value={startSection} onChange={event => setStartSection(event.target.value as SavedOwnerView["startSection"])}>
        {startSections.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
      <button type="button" onClick={addView}>Save current display as named view</button>
    </div>
    <h3>Saved display views</h3>
    {doc.views.length === 0 ? <p>No saved display views. Your current layout remains unchanged.</p> : (
      <ul className="hub-owner-view-list">{doc.views.map(view => <li key={view.name}>
        <strong>{view.name}</strong><span>{view.theme} · {view.density} · {view.startSection}</span>
        <button type="button" onClick={() => { onApply(view); setMessage(`Applied ${view.name}.`); }}>Apply {view.name}</button>
        <button type="button" onClick={() => persist({ ...doc, views: doc.views.filter(item => item.name !== view.name) })}>Remove {view.name}</button>
      </li>)}</ul>
    )}
    <div className="hub-owner-preferences-actions">
      <button type="button" onClick={exportViews}>Export display preferences</button>
      <button type="button" onClick={clearViews}>Reset saved display views</button>
    </div>
    <label htmlFor="hub-preferences-import">Import display preferences JSON (16 KB maximum)</label>
    <textarea id="hub-preferences-import" rows={3} value={importText} onChange={event => setImportText(event.target.value)} placeholder="Paste a prior export for this owner account" />
    <button type="button" disabled={!importText.trim()} onClick={importViews}>Validate &amp; import saved views</button>
    {message && <p role="status" aria-live="polite">{message}</p>}
  </section>;
}
