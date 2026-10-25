import { useEffect, useMemo, useState } from "react";

import {
  getCameraWallPreferences, getDeviceRegistryReviews, saveCameraWallPreferences,
  type CameraDashboard, type CameraRecord, type CameraWallPreferences,
  type DeviceRegistryAnnotation, type Go2RTCStatus,
} from "./api";
import { assessPrivatePlayback } from "./cameraPlaybackReview";

const defaults: CameraWallPreferences = { favorite_camera_ids: [], compact: false, revision: 0 };
const healthNames: Record<string, string> = {
  healthy: "Healthy", disabled: "Disabled", stale: "Stale — recheck",
  untested: "Not tested", unconfigured: "Not configured", failed: "Failed",
  unavailable: "Unavailable", no_producer: "No active producer",
};

export function cameraRoom(camera: CameraRecord, annotations: DeviceRegistryAnnotation[]): string {
  const note = annotations.find((item) => item.source === "camera" && item.source_id === String(camera.id));
  // Only reviewed Hub annotations, never a guessed association with an HA room.
  return note?.room_label?.trim() || "Unassigned cameras";
}

export function CameraWallV2({ cameras, dashboard, transport, userId }: {
  cameras: CameraRecord[];
  dashboard: CameraDashboard | null;
  transport: Go2RTCStatus | null;
  userId: number;
}) {
  const [annotations, setAnnotations] = useState<DeviceRegistryAnnotation[]>([]);
  const [roomsVerified, setRoomsVerified] = useState(false);
  const [saved, setSaved] = useState<CameraWallPreferences>(defaults);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [compact, setCompact] = useState(false);
  const [preferencesVerified, setPreferencesVerified] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [roomFilter, setRoomFilter] = useState("all");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setRoomsVerified(false);
    setPreferencesVerified(false);
    setAnnotations([]);
    setSaved(defaults);
    setFavorites([]);
    setCompact(false);
    setActiveId(null);
    setRoomFilter("all");
    setFavoriteOnly(false);
    void getDeviceRegistryReviews(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setAnnotations(result.annotations);
        setRoomsVerified(true);
      }
    }).catch(() => { if (!controller.signal.aborted) setRoomsVerified(false); });
    void getCameraWallPreferences(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setSaved(result);
        setFavorites(result.favorite_camera_ids);
        setCompact(result.compact);
        setPreferencesVerified(true);
      }
    }).catch(() => { if (!controller.signal.aborted) setNotice("Private layout could not be loaded. Saving is unavailable."); });
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) setActiveId(null); };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => document.removeEventListener("visibilitychange", stopWhenHidden);
  }, []);

  const healthById = useMemo(() => new Map((dashboard?.cameras ?? []).map((item) => [item.camera_id, item])), [dashboard]);
  const groups = useMemo(() => {
    const map = new Map<string, CameraRecord[]>();
    for (const camera of cameras) {
      const room = roomsVerified ? cameraRoom(camera, annotations) : "Room assignments unavailable";
      map.set(room, [...(map.get(room) ?? []), camera]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [cameras, annotations, roomsVerified]);
  const visible = groups.map(([room, entries]) => [room, entries.filter((camera) => !favoriteOnly || favorites.includes(camera.id))] as const)
    .filter(([room, entries]) => (roomFilter === "all" || room === roomFilter) && entries.length > 0);
  const active = cameras.find((camera) => camera.id === activeId);
  const activeHealth = active ? healthById.get(active.id) : undefined;
  // A failed dashboard transport observation is a playback HOLD even when a
  // previous go2rtc status read still said online.
  const safeTransport = dashboard?.transport_online === false ? null : transport;
  const activePlayback = active ? assessPrivatePlayback(
    active, activeHealth, safeTransport, window.location.hostname, dashboard?.stale_after_seconds ?? 300,
  ) : null;
  const activeReady = !!active && !!activePlayback?.ready;

  useEffect(() => {
    if (activeId !== null && !activeReady) setActiveId(null);
  }, [activeId, activeReady]);

  async function saveLayout() {
    if (!preferencesVerified || busy) return;
    setActiveId(null);
    setBusy(true);
    setNotice("");
    try {
      // No stream URLs, tokens, camera credentials, selected playback or notes are sent.
      const result = await saveCameraWallPreferences({
        favorite_camera_ids: favorites.filter((id) => cameras.some((camera) => camera.id === id)).slice(0, 24),
        compact, revision: saved.revision,
      });
      setSaved(result);
      setFavorites(result.favorite_camera_ids);
      setNotice("Private layout saved to this signed-in Hub account. Video remains stopped.");
    } catch {
      setNotice("Layout could not be saved. Reload to check sign-in, migration or another edit.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="camera-wall-v2" aria-label="Camera Wall V2">
    <header className="camera-wall-heading">
      <div>
        <p className="eyebrow">Build 141 · Private camera wall</p>
        <h2>Room and site camera groups</h2>
        <p>Camera health is an observation, not proof of moving video. Only one deliberately selected private stream can open.</p>
      </div>
      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">ⓘ</span> Camera wall help</summary>
        <ol>
          <li>Assign room labels in Devices → Device 360. Unassigned cameras remain grouped separately.</li>
          <li>Choose a room or favorites; only IDs and density are saved to your signed-in account.</li>
          <li>Inspect health, select a camera, then start one private preview on the Windows Hub browser.</li>
          <li>Stop the preview before leaving. Switching cameras, losing transport health or hiding the tab stops playback.</li>
          <li>If playback fails, check go2rtc loopback-only status, a fresh probe, local browser and source certificate/transport settings. Never expose RTSP addresses or ports publicly.</li>
        </ol>
      </details>
    </header>
    <div className="camera-wall-controls">
      <label>Room or site
        <select value={roomFilter} onChange={(e) => { setRoomFilter(e.target.value); setActiveId(null); }}>
          <option value="all">All groups</option>
          {groups.map(([room]) => <option key={room} value={room}>{room}</option>)}
        </select>
      </label>
      <label className="camera-wall-check"><input type="checkbox" checked={favoriteOnly} onChange={(e) => { setFavoriteOnly(e.target.checked); setActiveId(null); }} /> Favorites only</label>
      <label className="camera-wall-check"><input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> Compact cards</label>
      <button type="button" disabled={!preferencesVerified || busy || (saved.compact === compact && JSON.stringify(saved.favorite_camera_ids) === JSON.stringify(favorites))} onClick={() => void saveLayout()}>
        {busy ? "Saving…" : "Save private layout"}
      </button>
    </div>
    {!roomsVerified && <p className="camera-wall-caution">Room annotations unavailable or loading; camera identities remain separate and unassigned.</p>}
    {!preferencesVerified && <p className="camera-wall-caution">Personal layout not yet verified; saved preferences are unavailable.</p>}
    {notice && <p role="status">{notice}</p>}
    {cameras.length === 0 ? <p>No approved registered cameras yet. Review discovery first; no streams have started.</p> : visible.length === 0 ? <p>No cameras match this view. Clear Favorites only or choose All groups.</p> : null}
    {visible.map(([room, entries]) => <section key={room} className="camera-wall-group" aria-label={`${room} camera group`}>
      <h3>{room} <small>({entries.length})</small></h3>
      <div className={`camera-wall-grid${compact ? " is-compact" : ""}`}>
        {entries.map((camera) => {
          const health = healthById.get(camera.id);
          const playback = assessPrivatePlayback(camera, health, safeTransport, window.location.hostname, dashboard?.stale_after_seconds ?? 300);
          const isActive = camera.id === activeId && activeReady;
          return <article key={camera.id} className="camera-wall-card">
            <div className="camera-wall-card-title">
              <strong>{camera.display_name}</strong>
              <span className={`camera-health camera-health-${health?.health ?? "untested"}`}>
                {healthNames[health?.health ?? "untested"] ?? "Not verified"}
              </span>
            </div>
            <div className="camera-wall-still" aria-label="Still preview unavailable">Still image unavailable — no snapshot has been requested</div>
            <p>{!camera.enabled ? "Registry disabled" : playback.ready ? "Private preview eligible" : playback.reason}</p>
            <p className="camera-wall-observed">Last probe: {health?.last_probe_at ? new Date(health.last_probe_at).toLocaleString() : "Never"}</p>
            <div className="camera-wall-card-actions">
              <button type="button" disabled={!playback.ready} aria-pressed={isActive}
                onClick={() => setActiveId((id) => id === camera.id ? null : camera.id)}>
                {isActive ? "Stop preview" : "Start private preview"}
              </button>
              <button type="button" disabled={!preferencesVerified || (favorites.length >= 24 && !favorites.includes(camera.id))}
                aria-pressed={favorites.includes(camera.id)}
                onClick={() => setFavorites((old) => old.includes(camera.id) ? old.filter((id) => id !== camera.id) : [...old, camera.id])}>
                {favorites.includes(camera.id) ? "★ Saved favorite" : "☆ Favorite"}
              </button>
            </div>
          </article>;
        })}
      </div>
    </section>)}
    {activeReady && activePlayback?.viewerUrl && active ? <section className="camera-wall-focus" aria-label="Selected large private playback">
      <div><h3>{active.display_name} — selected private view</h3><button type="button" onClick={() => setActiveId(null)}>Stop large preview</button></div>
      <iframe key={active.id} title={`${active.display_name} live view`} src={activePlayback.viewerUrl}
        loading="lazy" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer"
        onError={() => { setActiveId(null); setNotice("Private playback did not load. Check browser certificate and local transport; no address was displayed."); }} />
      <p>Moving video still requires human confirmation. No background wall streams or auto-reconnect.</p>
    </section> : null}
  </section>;
}
