import type { CameraHealthItem, CameraRecord, Go2RTCStatus } from "./api";

/** This is a local-browser safety check, never a substitute for server authorization. */
export function assessPrivatePlayback(
  camera: CameraRecord,
  health: CameraHealthItem | undefined,
  transport: Go2RTCStatus | null,
  browserHostname: string,
  staleAfterSeconds: number,
  now = Date.now(),
  forProbe = false,
): { ready: boolean; reason: string; viewerUrl: string | null } {
  const hold = (reason: string) => ({ ready: false, reason, viewerUrl: null });
  if (!camera.enabled || !camera.stream?.enabled) return hold("Registry or stream is disabled. Leave it disabled until reviewed.");
  if (!camera.stream.encrypted) return hold("The RTSP source is not confirmed encrypted at rest.");
  if (!transport?.online || !transport.local_api_only || !transport.local_rtsp_only) {
    return hold("go2rtc is unavailable or either listener is not loopback-only.");
  }
  if (browserHostname !== "localhost" && browserHostname !== "127.0.0.1") {
    return hold("Private preview is restricted to a browser on the Windows Hub itself; never connect this browser to another device's localhost.");
  }
  if (!health || health.camera_id !== camera.id || !health.enabled || !health.configured) return hold("Current camera registry and health identity are required.");
  if (!forProbe) {
    if (health.health !== "healthy") return hold("A successful camera health probe is required.");
    const lastProbe = Date.parse(health.last_probe_at ?? "");
    if (!Number.isFinite(lastProbe) || lastProbe > now + 30_000 || now - lastProbe > Math.min(staleAfterSeconds, 300) * 1000) {
      return hold("The last probe is missing, expired, or future-dated. Recheck this camera.");
    }
  }
  if (health.stream_name !== camera.stream.stream_name || health.source_host !== camera.stream.source_host) {
    return hold("The registered stream identity changed. Review before opening video.");
  }
  try {
    const viewer = new URL(health.viewer_url ?? "");
    const api = new URL(transport.api_base_url);
    if (viewer.protocol !== "http:" || viewer.username || viewer.password ||
        !["127.0.0.1", "localhost"].includes(viewer.hostname) ||
        api.origin !== viewer.origin || viewer.pathname !== "/stream.html" ||
        viewer.searchParams.get("src") !== camera.stream.stream_name) {
      return hold("The viewer does not match the registered private local go2rtc source.");
    }
    return { ready: true, reason: forProbe ? "Private transport eligible for an explicit, bounded probe." : "Private transport and recent probe verified. Moving video still requires human review.", viewerUrl: viewer.href };
  } catch {
    return hold("Viewer address is invalid or missing.");
  }
}

/** Binding contains identifiers only; never a source URL, secret or RTSP credential. */
export function cameraBinding(camera: CameraRecord): string {
  return [camera.id, camera.endpoint_uuid, camera.host, camera.port,
    camera.enabled, camera.stream?.id, camera.stream?.enabled,
    camera.stream?.stream_name, camera.stream?.source_host, camera.stream?.source_port,
    camera.stream?.source_scheme].join("|");
}
