import { useState } from "react";
import type { ShellTheme } from "./CommandShell";
import {
  THEME_CHECKS386, THEME_PALETTES386, VIEWPORTS386,
  initialMatrix386, matrixDisposition386, matrixKey386, recordOwnerTheme386,
  themeContrast386,
  type ThemeId386, type Viewport386,
} from "./themeAcceptance386";

/** Manual session-only evidence, never original-device, third-party Master or WCAG audit proof. */
export function ThemeAcceptance386Panel({
  activeTheme,
  onApplyTheme,
}: {
  activeTheme: ShellTheme;
  onApplyTheme: (value: ShellTheme) => void;
}) {
  const [selected, setSelected] = useState<ThemeId386>("instrument");
  const [viewport, setViewport] = useState<Viewport386>("desktop");
  const [matrix, setMatrix] = useState(initialMatrix386);
  const [longValue, setLongValue] = useState(
    "This sample illustrates a long field value while maintaining visible text and controls.",
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sampleType, setSampleType] = useState("standard");
  const [sampleInvalid, setSampleInvalid] = useState(false);
  const theme = THEME_PALETTES386.find(item => item.id === selected)!;
  const checks = matrixDisposition386(matrix);
  const contrast = themeContrast386(selected);
  const selectedKey = matrixKey386(selected, viewport);
  const currentFinding = matrix[selectedKey] ?? "not_checked";
  const previewStyle = {
    background: theme.background,
    color: theme.text,
    borderColor: theme.accent,
  } as const;
  const fieldStyle = {
    background: theme.surface,
    color: theme.text,
    borderColor: theme.accent,
    colorScheme: selected === "daylight" ? "light" : "dark",
  } as const;

  return <section className="theme386-acceptance" aria-label="Sixteen-theme accessibility review">
    <header>
      <p className="eyebrow">Build 386 · Original-device review pending</p>
      <h2>Shared 16-theme accessibility workshop</h2>
      <p>Select a palette and device size, inspect the actual interface, and record any
        visual or keyboard problems. The preview is a sample, not proof that all live
        screens in the three Masters match.</p>
    </header>
    <p role="status"><strong>{checks.status}</strong>
      {" · "}{checks.ownerReportedReviewed}/48 combinations reviewed locally
      {" · "}{checks.ownerReportedIssues} owner-reported issues</p>

    <fieldset className="theme386-palette-picker">
      <legend>Choose one of the 16 shared Master palettes</legend>
      <div className="theme386-palette-grid">
        {THEME_PALETTES386.map(p => <button
          type="button" key={p.id}
          aria-pressed={p.id === selected}
          aria-label={"Preview " + p.label}
          onClick={() => setSelected(p.id)}
          className="theme386-palette-choice"
        >
          <span aria-hidden="true" className="theme386-swatch"
            style={{ background: p.panel, color: p.text, borderColor: p.accent }}>
            <span style={{ background: p.accent }} />
          </span>
          <span>{p.label}</span>
        </button>)}
      </div>
    </fieldset>
    <div className="theme386-controls">
      <fieldset>
        <legend>Device width for review</legend>
        {VIEWPORTS386.map(device => <label key={device.id}>
          <input type="radio" name="theme386-viewport"
            checked={viewport === device.id}
            onChange={() => setViewport(device.id)} />
          {device.label}
        </label>)}
      </fieldset>
      <div className="theme386-actions">
        <button type="button" onClick={() => onApplyTheme(selected)}>
          Apply {theme.label} to the actual Hub shell
        </button>
        <p>Current full Hub theme: <strong>{activeTheme}</strong>.
          The sample below previews the selected palette even before applying it.</p>
      </div>
    </div>
    <p>Measured static palette contrast: body {contrast.mainText.toFixed(2)}:1,
      muted {contrast.mutedText.toFixed(2)}:1,
      focus edge {contrast.focusBoundary.toFixed(2)}:1.
      These numbers are computed from the shared palette values, not screenshots
      or the computed CSS of every real screen.</p>

    <div className="theme386-preview-scroll" role="region"
      aria-label="Responsive theme sample viewport" tabIndex={0}>
      <div className="theme386-demo" data-preview-theme={selected}
        data-preview-viewport={viewport} style={previewStyle}>
        <h3>{theme.label} · {viewport}</h3>
        <p className="theme386-demo-muted" style={{ color: theme.muted }}>
          Muted helper text should remain readable when magnified or on mobile.
        </p>
        <div className="theme386-demo-card"
          style={{ background: theme.panel, color: theme.text, borderColor: theme.accent }}>
          <label htmlFor="theme386-long-text">Long field value / label alignment</label>
          <input id="theme386-long-text" value={longValue} onChange={event =>
            setLongValue(event.target.value.slice(0, 180))}
          maxLength={180} style={fieldStyle} />
          <small id="theme386-length-note" style={{ color: theme.muted }}>
            {longValue.length}/180 characters; field content wraps or scrolls naturally.
          </small>
          <div className="theme386-date-row">
            <label htmlFor="theme386-date">Native date
              <input id="theme386-date" type="date" value={date}
                onChange={event => setDate(event.target.value)} style={fieldStyle} />
            </label>
            <label htmlFor="theme386-time">Native time
              <input id="theme386-time" type="time" value={time}
                onChange={event => setTime(event.target.value)} style={fieldStyle} />
            </label>
          </div>
          <label htmlFor="theme386-select">Select menu
            <select id="theme386-select" value={sampleType}
              onChange={event => setSampleType(event.target.value)} style={fieldStyle}>
              <option value="standard">Normal (no network action)</option>
              <option value="long">A longer, wrapping selectable display option</option>
            </select>
          </label>
          <label htmlFor="theme386-invalid">Validation visibility sample
            <input id="theme386-invalid" value={sampleInvalid ? "" : "Sample only"}
              readOnly aria-invalid={sampleInvalid}
              aria-describedby={sampleInvalid ? "theme386-error" : undefined}
              style={fieldStyle} />
          </label>
          {sampleInvalid && <p role="alert" id="theme386-error"
            className="theme386-error" style={{ borderColor: theme.accent }}>
            Sample validation failure; no account or device action occurred.
          </p>}
          <button type="button" className="theme386-demo-button" style={fieldStyle}
            onClick={() => setSampleInvalid(value => !value)}>
            {sampleInvalid ? "Clear validation example" : "Show validation example"}
          </button>
        </div>
      </div>
    </div>
    <fieldset className="theme386-manual-checks">
      <legend>Test these five criteria on a REAL device or browser</legend>
      <ul>{THEME_CHECKS386.map(item => <li key={item}>{item}</li>)}</ul>
      <p>For 200% zoom, use your browser’s real zoom controls; the framed preview
        simulates CSS width, not a physical tablet or phone. Test Tab, Shift+Tab,
        Enter and Escape in the real interface.</p>
      <p>Selected combination: <strong>{theme.label} · {viewport}</strong>
        {" · "} {currentFinding.replaceAll("_", " ")}</p>
      <div className="theme386-review-buttons">
        <button type="button"
          onClick={() => setMatrix(current =>
            recordOwnerTheme386(current, selected, viewport, "owner_reports_pass"))}>
          Report locally reviewed / acceptable
        </button>
        <button type="button"
          onClick={() => setMatrix(current =>
            recordOwnerTheme386(current, selected, viewport, "owner_reports_issue"))}>
          Report issue requiring follow-up
        </button>
        <button type="button"
          onClick={() => setMatrix(current =>
            recordOwnerTheme386(current, selected, viewport, "not_checked"))}>
          Clear this local report
        </button>
      </div>
    </fieldset>

    <details>
      <summary>View all 48 theme/device reports</summary>
      <div className="theme386-report-table-scroll">
        <table className="theme386-matrix">
          <caption>Owner's session-only observations; 16 palettes by three device widths</caption>
          <thead><tr><th scope="col">Theme</th>
            {VIEWPORTS386.map(v => <th scope="col" key={v.id}>{v.label}</th>)}
          </tr></thead>
          <tbody>{THEME_PALETTES386.map(p => <tr key={p.id}>
            <th scope="row">{p.label}</th>
            {VIEWPORTS386.map(v => <td key={v.id}>
              <button type="button"
                onClick={() => { setSelected(p.id); setViewport(v.id); }}
                aria-label={"Review " + p.label + " on " + v.label}>
                {(matrix[matrixKey386(p.id, v.id)] ?? "not_checked").replaceAll("_", " ")}
              </button>
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </details>
    <p><strong>Field certification remains HOLD.</strong> Reports are kept only in this
      local component session; they do not sign acceptance, enroll the Windows host,
      change any source contract, or authorize external Master/device connections.</p>
  </section>;
}
