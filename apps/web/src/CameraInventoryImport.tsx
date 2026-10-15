import { useState } from "react";

import {
  commitCameraInventoryImport,
  previewCameraInventoryImport,
  type CameraImportEntry,
  type CameraImportPreview,
} from "./api";

const KEY = "rosevear.camera.compatibility.v1";
const methods = new Set(["unverified", "rtsp", "onvif", "manufacturer", "alexa_only", "unsupported"]);

function legacyEntries(): CameraImportEntry[] {
  let value: unknown;
  try {
    value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
  } catch {
    throw new Error("Legacy worksheet could not be read. Export a copy before making changes.");
  }
  if (!Array.isArray(value)) throw new Error("Legacy worksheet is not a valid array.");
  if (value.length > 100) throw new Error("Legacy worksheet exceeds its original 100-entry limit.");
  const entries: CameraImportEntry[] = [];
  for (const record of value) {
    if (!record || typeof record !== "object") {
      throw new Error("Legacy worksheet includes a malformed entry.");
    }
    const row = record as Record<string, unknown>;
    if (typeof row.brand !== "string" || typeof row.model !== "string" ||
      typeof row.location !== "string" || typeof row.method !== "string" ||
      typeof row.evidence !== "string" || !methods.has(row.method)) {
      throw new Error("Legacy model data is incomplete. No records were imported.");
    }
    if (!row.brand.trim() || !row.model.trim() || row.brand.length > 80 ||
      row.model.length > 120 || row.location.length > 120 || row.evidence.length > 400) {
      throw new Error("Legacy model data contains an invalid field length.");
    }
    // Client-side 'approved' is deliberately ignored; new server plans require new review.
    entries.push({
      brand: row.brand.trim(),
      model: row.model.trim(),
      location: row.location.trim(),
      method: row.method as CameraImportEntry["method"],
      evidence: row.evidence.trim(),
    });
  }
  return entries;
}

export function CameraInventoryImport({
  canAdminister, onImported,
}: { canAdminister: boolean; onImported: () => Promise<void> }) {
  const [preview, setPreview] = useState<CameraImportPreview | null>(null);
  const [source, setSource] = useState<CameraImportEntry[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function beginPreview() {
    setBusy(true);
    setReviewed(false);
    setPreview(null);
    setMessage("");
    try {
      const all = legacyEntries();
      if (!all.length) {
        setMessage("No legacy camera records found in this browser.");
        return;
      }
      if (all.length > 50) {
        setMessage("Import up to 50 entries at a time; export and review the worksheet first.");
        return;
      }
      const result = await previewCameraInventoryImport(all);
      setSource(all);
      setPreview(result);
      setMessage(
        result.ready + " ready, " + result.conflicts +
        " already recorded. Conflicting entries will not be overwritten.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preview unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview || !reviewed || !canAdminister || busy) return;
    const selected = preview.rows
      .filter((row) => row.status === "ready")
      .map((row) => source[row.index]);
    if (!selected.length) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await commitCameraInventoryImport(selected, preview.server_snapshot);
      setMessage(
        result.imported + " records imported without approval. Legacy worksheet preserved.",
      );
      setPreview(null);
      setReviewed(false);
      await onImported();
    } catch (error) {
      setMessage(
        (error instanceof Error ? error.message : "Import failed.") +
        " No legacy entries were removed. Preview again before retrying.",
      );
      setPreview(null);
      setReviewed(false);
    } finally {
      setBusy(false);
    }
  }

  if (!canAdminister) return null;
  return (
    <section aria-label="Import browser camera models">
      <h3>Build 075 — Review legacy browser inventory</h3>
      <p>Read-only preview first. Nothing is imported automatically, and existing server
        records are never overwritten. Browser-local approval flags are not transferred.</p>
      <button type="button" disabled={busy} onClick={() => void beginPreview()}>
        Preview browser entries
      </button>
      {preview ? (
        <div>
          <p>{preview.ready} ready; {preview.conflicts} conflicts.</p>
          <ul>{preview.rows.map((row) => (
            <li key={row.index}>
              {source[row.index].brand} — {source[row.index].model}:
              {" "}{row.status === "ready" ? "Will be imported unapproved" :
                "Existing record #" + row.existing_id + " — skipped"}
            </li>
          ))}</ul>
          {preview.ready > 0 ? (
            <>
              <label><input type="checkbox" checked={reviewed} disabled={busy}
                onChange={(event) => setReviewed(event.target.checked)} />
                I reviewed the ready entries and approve importing them as unapproved plans.
              </label>
              <button type="button" disabled={!reviewed || busy} onClick={() => void commit()}>
                Confirm import of {preview.ready} unapproved records
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
