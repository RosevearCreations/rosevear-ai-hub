import { useState } from "react";

type Check = { id: string; label: string };
const checks: Check[] = [
  { id: "registered", label: "Camera is known to us and registered; it was not auto-enabled by discovery." },
  { id: "encrypted", label: "RTSP/RTSPS source was supplied through the password field and saved encrypted." },
  { id: "loopback", label: "go2rtc API and RTSP listeners both report loopback-only." },
  { id: "probe", label: "The selected enabled camera has a recent successful stream probe." },
  { id: "playback", label: "We viewed moving video in the local browser, not just an online API status." },
  { id: "recheck", label: "We rechecked playback after a normal refresh, without restarting Home Assistant or MQTT." },
];

export function CameraStreamAcceptance() {
  const [checked, setChecked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const complete = checks.every((check) => checked.includes(check.id));
  return (
    <section className="panel" aria-label="Build 071 verified stream acceptance">
      <h2>Build 071 — Verify a real camera stream</h2>
      <p>A running go2rtc service or a producer count alone does not prove playable video.
        Confirm a recognized camera manually. This checklist is local to this browser view;
        it is not stored or reported as production evidence.</p>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Hide verification checklist" : "Show verification checklist"}
      </button>
      {open ? (
        <div>
          {checks.map((check) => (
            <label key={check.id} className="camera-discovery-choice">
              <input type="checkbox" checked={checked.includes(check.id)}
                onChange={(event) => setChecked((current) =>
                  event.target.checked
                    ? [...current, check.id]
                    : current.filter((id) => id !== check.id)
                )} />
              {check.label}
            </label>
          ))}
          <p role="status">{complete
            ? "Local operator checklist complete. Verify on the actual Windows Hub before claiming camera acceptance."
            : checked.length + " of " + checks.length + " manual checks acknowledged. Stream acceptance remains unverified."}</p>
          <button type="button" onClick={() => setChecked([])}>Clear local checklist</button>
        </div>
      ) : null}
    </section>
  );
}
