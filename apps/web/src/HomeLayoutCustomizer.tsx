import { useState, type ReactNode } from "react";

import type { AuthRole } from "./api";
import {
  clearHomeLayout, defaultHomeLayout, loadHomeLayout, moveHomeWidget,
  saveHomeLayout, toggleHomeWidget, type HomeLayout, type HomeWidgetId,
} from "./homeLayoutPreference";
import "./homeLayoutCustomizer.css";

const LABELS: Record<HomeWidgetId, string> = {
  guide: "Start guide",
  operations: "Operations dashboard",
  shortcuts: "Local shortcuts",
};

export function HomeLayoutCustomizer({ accountId, role, widgets }: {
  accountId: number;
  role: AuthRole;
  widgets: Record<HomeWidgetId, ReactNode>;
}) {
  const [layout, setLayout] = useState<HomeLayout>(() => loadHomeLayout(accountId));
  const [saveMessage, setSaveMessage] = useState("Choose a layout to save it for this account on this browser.");

  function update(next: HomeLayout) {
    setLayout(next);
    setSaveMessage(saveHomeLayout(accountId, next)
      ? "Layout saved on this browser for this account."
      : "Layout changed for now, but browser storage is unavailable; changes may not survive a refresh.");
  }

  function reset() {
    setLayout(defaultHomeLayout());
    setSaveMessage(clearHomeLayout(accountId)
      ? "Default Home layout restored. The saved preference was removed."
      : "Default Home layout restored for now; browser storage could not be cleared.");
  }

  const visible = layout.order.filter(id => !layout.hidden.includes(id));
  return <section className="home-layout-customizer" aria-labelledby="home-layout-title">
    <header className="home-layout-heading">
      <div>
        <p className="eyebrow">My Home dashboard</p>
        <h2 id="home-layout-title">Arrange our Home widgets</h2>
        <p>Signed in as {role.replaceAll("_", " ")}. Essential Hub, Comms and relay status cards always remain visible above.</p>
        <small>Preferences stay on this browser for this account. They do not change permissions or run actions.</small>
      </div>
      <button type="button" className="home-layout-reset" onClick={reset}>Reset Home layout</button>
    </header>

    <div className="home-layout-controls" role="group" aria-label="Home widget layout controls">
      {layout.order.map((id, index) => {
        const shown = !layout.hidden.includes(id);
        return <div className="home-layout-control" key={id}>
          <strong>{LABELS[id]}</strong>
          <span>{shown ? "Shown" : "Hidden"}</span>
          <div className="home-layout-actions">
            <button type="button" disabled={index === 0} aria-label={`Move ${LABELS[id]} up`}
              onClick={() => update(moveHomeWidget(layout, id, -1))}>Move up</button>
            <button type="button" disabled={index === layout.order.length - 1} aria-label={`Move ${LABELS[id]} down`}
              onClick={() => update(moveHomeWidget(layout, id, 1))}>Move down</button>
            <button type="button" aria-pressed={shown} aria-label={`${shown ? "Hide" : "Show"} ${LABELS[id]}`}
              onClick={() => update(toggleHomeWidget(layout, id))}>{shown ? "Hide" : "Show"}</button>
          </div>
        </div>;
      })}
    </div>
    <p className="home-layout-save-message" role="status">{saveMessage}</p>

    {visible.length === 0
      ? <div className="home-layout-empty" role="status">
        <h3>No optional widgets are showing</h3>
        <p>Essential status cards are still visible. Choose Show above or reset the layout to bring all Home widgets back.</p>
      </div>
      : visible.map(id => <section className="home-layout-widget" aria-label={`${LABELS[id]} widget`} key={id}>
        {widgets[id]}
      </section>)}
  </section>;
}
