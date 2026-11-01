import { useEffect, useState, type FormEvent } from "react";
import {
  createWorkshopJob, deleteWorkshopJobPhoto, getWorkshopEquipment, getWorkshopJobs,
  updateWorkshopJob, uploadWorkshopJobPhoto, workshopJobPhotoUrl,
  type AuthUser, type WorkshopEquipment, type WorkshopJob, type WorkshopJobCategory,
  type WorkshopJobInput, type WorkshopJobMaterial, type WorkshopJobStatus, type WorkshopMaterialUnit,
} from "./api";

const CATEGORIES: WorkshopJobCategory[] = ["jewelry", "3d_print", "cnc", "laser", "casting", "sublimation", "other"];
const STATUSES: WorkshopJobStatus[] = ["planned", "active", "paused", "completed"];
const UNITS: WorkshopMaterialUnit[] = ["piece", "g", "kg", "ml", "l", "mm", "cm", "m"];
const EMPTY_MATERIAL: WorkshopJobMaterial = { name: "", unit: "piece", estimated: "0", actual: "0" };

export function blankWorkshopJob(): WorkshopJobInput {
  return { title: "", category: "jewelry", equipment_id: null, status: "planned",
    progress_percent: 0, estimated_minutes: 0, actual_minutes: 0,
    materials: [], notes: "", archived: false };
}

export function jobMaterialSummary(job: WorkshopJob): string {
  return job.materials.length
    ? job.materials.map((item) => `${item.name}: ${item.actual}/${item.estimated} ${item.unit}`).join(" · ")
    : "No materials recorded";
}

export function WorkshopJobsPanel({ role }: { role: AuthUser["role"] }) {
  const canEdit = role === "owner" || role === "administrator";
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [equipment, setEquipment] = useState<WorkshopEquipment[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<WorkshopJobInput>(blankWorkshopJob);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  async function refresh(archived = includeArchived) {
    const [nextJobs, nextEquipment] = await Promise.all([getWorkshopJobs(archived), getWorkshopEquipment()]);
    setJobs(nextJobs); setEquipment(nextEquipment);
  }

  useEffect(() => {
    let active = true;
    Promise.all([getWorkshopJobs(includeArchived), getWorkshopEquipment()]).then(([nextJobs, nextEquipment]) => {
      if (active) { setJobs(nextJobs); setEquipment(nextEquipment); }
    }).catch(() => { if (active) setError("Local workshop jobs unavailable. Verify database migration 0028."); });
    return () => { active = false; };
  }, [includeArchived]);

  const selectedJob = jobs.find((job) => job.id === selected);
  function openJob(job: WorkshopJob) {
    setSelected(job.id); setRevision(job.revision);
    setDraft({ title: job.title, category: job.category, equipment_id: job.equipment_id,
      status: job.status, progress_percent: job.progress_percent,
      estimated_minutes: job.estimated_minutes, actual_minutes: job.actual_minutes,
      materials: job.materials.map((item) => ({ ...item })), notes: job.notes, archived: job.archived });
    setError(""); setNotice(""); setPhoto(null);
  }

  function changeMaterial(index: number, part: Partial<WorkshopJobMaterial>) {
    setDraft((current) => ({ ...current, materials: current.materials.map((item, i) =>
      i === index ? { ...item, ...part } : item) }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = selected === null
        ? await createWorkshopJob(draft)
        : await updateWorkshopJob(selected, { ...draft, expected_revision: revision });
      await refresh(true);
      setIncludeArchived(true);
      openJob(result);
      setNotice("Manual job saved and audited. No equipment, inventory or financial posting occurred.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Job save failed; refresh the record before retrying.");
    } finally { setBusy(false); }
  }

  async function upload() {
    if (!canEdit || !selected || !photo || busy) return;
    setBusy(true); setError("");
    try {
      await uploadWorkshopJobPhoto(selected, photo);
      await refresh(true); setPhoto(null);
      setNotice("Photo stored privately in the local Hub database.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Photo upload failed."); }
    finally { setBusy(false); }
  }

  async function removePhoto(photoId: number) {
    if (!canEdit || !selected || busy || !window.confirm("Permanently delete this private photo?")) return;
    setBusy(true); setError("");
    try {
      await deleteWorkshopJobPhoto(selected, photoId);
      await refresh(true); setNotice("Private photo removed.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Photo removal failed."); }
    finally { setBusy(false); }
  }

  return <section className="panel workshop-jobs-panel" aria-label="Workshop jobs and material use">
    <h2>Build 218 — Workshop jobs, material use &amp; project evidence</h2>
    <p>Offline manual project ledger. Quantities and times are estimates/observations, not automatic inventory deductions or accounting entries. No machine control.</p>
    <details><summary>ⓘ Job and private evidence help</summary>
      <p>Use one unit per material row; values are not automatically converted. Actual use may be entered over time. Archive a job to remove it from the active list; show archived jobs to restore it.</p>
      <p>Photos (maximum five, 2 MB each) stay in the authenticated local Hub database, never a public gallery or AI index. Deleting a photo is permanent; job edits and archives remain reversible.</p>
    </details>
    <label><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Show archived workshop jobs</label>
    <button type="button" disabled={busy} onClick={() => void refresh().catch(() => setError("Refresh failed."))}>Refresh jobs</button>
    {canEdit && <button type="button" disabled={busy} onClick={() => { setSelected(null); setRevision(0); setDraft(blankWorkshopJob()); setError(""); }}>New workshop job</button>}
    <ul className="workshop-items">
      {jobs.map((job) => <li key={job.id} className="workshop-item">
        <strong>{job.title}</strong> · {job.category.replaceAll("_", " ")} · {job.status} · {job.progress_percent}%
        {job.archived ? " · Archived" : ""}
        <p>{jobMaterialSummary(job)}</p>
        <button type="button" onClick={() => openJob(job)}>Review job {job.id}</button>
      </li>)}
    </ul>
    {jobs.length === 0 && <p>No workshop jobs in this view.</p>}
    {(canEdit || selectedJob) && <section className="connection-guidance" aria-label="Selected workshop job">
      <h3>{selected === null ? "New workshop job" : `Job ${selected} — details`}</h3>
      <form className="workshop-form" onSubmit={(event) => void save(event)}>
        <label>Job title <input required maxLength={160} disabled={!canEdit} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>Project type <select disabled={!canEdit} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as WorkshopJobCategory })}>
          {CATEGORIES.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}
        </select></label>
        <label>Related equipment (optional) <select disabled={!canEdit} value={draft.equipment_id ?? ""} onChange={(event) => setDraft({ ...draft, equipment_id: event.target.value ? Number(event.target.value) : null })}>
          <option value="">None</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Status <select disabled={!canEdit} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as WorkshopJobStatus })}>
          {STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select></label>
        <label>Progress percent <input disabled={!canEdit} type="number" min={0} max={100} required value={draft.progress_percent} onChange={(event) => setDraft({ ...draft, progress_percent: Number(event.target.value) })} /></label>
        <label>Estimated time (minutes) <input disabled={!canEdit} type="number" min={0} max={1000000} required value={draft.estimated_minutes} onChange={(event) => setDraft({ ...draft, estimated_minutes: Number(event.target.value) })} /></label>
        <label>Actual time (minutes) <input disabled={!canEdit} type="number" min={0} max={1000000} required value={draft.actual_minutes} onChange={(event) => setDraft({ ...draft, actual_minutes: Number(event.target.value) })} /></label>
        <fieldset><legend>Bill of materials and actual consumables</legend>
          {draft.materials.map((material, i) => <div className="workshop-form" key={i}>
            <label>Material {i + 1} name <input disabled={!canEdit} maxLength={120} required value={material.name} onChange={(event) => changeMaterial(i, { name: event.target.value })} /></label>
            <label>Unit <select disabled={!canEdit} value={material.unit} onChange={(event) => changeMaterial(i, { unit: event.target.value as WorkshopMaterialUnit })}>
              {UNITS.map((unit) => <option key={unit}>{unit}</option>)}
            </select></label>
            <label>Estimated quantity <input disabled={!canEdit} type="number" min={0} step="0.001" required value={material.estimated} onChange={(event) => changeMaterial(i, { estimated: event.target.value })} /></label>
            <label>Actual quantity <input disabled={!canEdit} type="number" min={0} step="0.001" required value={material.actual} onChange={(event) => changeMaterial(i, { actual: event.target.value })} /></label>
            {canEdit && <button type="button" onClick={() => setDraft({ ...draft, materials: draft.materials.filter((_, j) => i !== j) })}>Remove material {i + 1}</button>}
          </div>)}
          {canEdit && <button type="button" disabled={draft.materials.length >= 30} onClick={() => setDraft({ ...draft, materials: [...draft.materials, { ...EMPTY_MATERIAL }] })}>Add material</button>}
        </fieldset>
        <label>Project notes and evidence context <textarea disabled={!canEdit} maxLength={2000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
        {canEdit && <label><input type="checkbox" checked={draft.archived} onChange={(event) => setDraft({ ...draft, archived: event.target.checked })} /> Archived (reversible)</label>}
        {canEdit && <button type="submit" disabled={busy}>{selected === null ? "Create manual job" : `Save job revision ${revision}`}</button>}
      </form>
      {selectedJob && <section aria-label="Private job photos">
        <h4>Private local photos</h4>
        <ul>{selectedJob.photos.map((item) => <li key={item.id}>
          <a href={workshopJobPhotoUrl(selectedJob.id, item.id)} target="_blank" rel="noopener noreferrer">View private photo {item.id}</a>
          {canEdit && <button type="button" disabled={busy} onClick={() => void removePhoto(item.id)}>Remove photo {item.id}</button>}
        </li>)}</ul>
        {canEdit && <div className="workshop-form">
          <label>Attach private photo (PNG/JPEG/WebP, maximum 2 MB)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
          </label>
          <button type="button" disabled={busy || !photo || selectedJob.photos.length >= 5} onClick={() => void upload()}>Upload private photo</button>
        </div>}
      </section>}
    </section>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
