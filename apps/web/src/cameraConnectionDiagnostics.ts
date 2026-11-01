import type { CameraCompatibilityPlan } from "./api";

export const CAMERA_SOURCES = [
  { brand: "Blink", next: "Confirm the exact model and manufacturer's permitted integration path." },
  { brand: "littlelf", next: "Confirm whether this exact model documents a permitted local feed." },
  { brand: "Nooie", next: "Confirm the model-specific manufacturer integration and local-feed policy." },
  { brand: "Netvue", next: "Check the exact model's official connectivity documentation." },
  { brand: "Alarm.com", next: "Ask the Bell/Alarm.com account administrator which integrations are authorized." },
  { brand: "SkyBell", next: "Check the doorbell model and service account's authorized integrations." },
] as const;

export function cameraConnectionReadback(plan: CameraCompatibilityPlan) {
  const hasEvidence = plan.evidence.trim().length >= 8;
  if (plan.method === "unsupported") return {
    label: "No supported Hub connection recorded", next: "Keep the camera out of Hub playback until an authorized path is documented.",
  };
  if (plan.method === "alexa_only") return {
    label: "Alexa viewing only — not a verified Hub feed", next: "Do not treat an Alexa picture as RTSP, ONVIF or Hub stream access.",
  };
  if (plan.method === "unverified" || !hasEvidence) return {
    label: "Connection capability unknown", next: "Confirm the exact model, authorized access method and non-secret documentation reference.",
  };
  if (!plan.approved_at) return {
    label: "Documented method — owner review pending", next: "Review the evidence and authorization before approving the plan. No stream has been tested.",
  };
  return {
    label: "Owner-reviewed connection plan — live feed unverified", next: "Separately verify credentials/permissions and manual playback on the Windows Hub; record field acceptance.",
  };
}

export function cameraSourceReadback(brand: string, plans: CameraCompatibilityPlan[]) {
  const matching = plans.filter((plan) => plan.brand.toLowerCase() === brand.toLowerCase());
  return matching.length ? `${matching.length} recorded model${matching.length === 1 ? "" : "s"}; check each model below.`
    : "No model recorded — capability unknown.";
}
