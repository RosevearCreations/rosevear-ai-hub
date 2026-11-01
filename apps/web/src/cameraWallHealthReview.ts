import type { CameraHealthItem } from "./api";

/** Read-only, privacy-safe health interpretation. Never display last_error, addresses or URLs. */
export function cameraWallHealthReview(health: CameraHealthItem | undefined, now: number,
  staleAfterSeconds: number) {
  if (!health) return { attention: true, status: "Health not verified", next: "Refresh the camera dashboard and confirm the exact camera identity.", probe: "No verified probe", lastGood: "No verified last-good frame metadata" };
  const when = Date.parse(health.last_probe_at ?? "");
  const ageValid = Number.isFinite(when) && when <= now + 30_000 &&
    now - when <= Math.min(Math.max(staleAfterSeconds, 1), 300) * 1000;
  const isHealthy = health.enabled && health.configured && health.health === "healthy" &&
    health.last_probe_status === "online" && ageValid;
  const next = !health.enabled ? "Camera is disabled. Ask an owner to review before enabling it."
    : !health.configured ? "Confirm an authorized camera source and private stream configuration."
    : !ageValid ? "Probe is missing or stale. Request a bounded manual health recheck before playback."
    : health.health !== "healthy" || health.last_probe_status !== "online" ? "Inspect source availability and local transport; test playback manually on the Windows Hub."
    : "A recent probe passed; start private playback explicitly and confirm moving video yourself.";
  return {
    attention: !isHealthy, status: isHealthy ? "Recent probe healthy — video not field-verified" : "Needs owner review",
    next, probe: ageValid ? "Recent probe recorded" : "No fresh trusted probe",
    lastGood: "No verified last-good frame metadata",
  };
}
