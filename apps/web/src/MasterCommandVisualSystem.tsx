import type { ReactNode } from "react";
import "./masterCommandVisualSystem.css";

export type MasterCommandTone = "neutral" | "info" | "healthy" | "warning" | "critical";
export interface MasterCommandKpi {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: MasterCommandTone;
}
export interface MasterCommandLink {
  id: string;
  label: string;
  detail: string;
  href: string;
  status: string;
  tone: MasterCommandTone;
  percent?: number;
}
export interface MasterCommandNav {
  id: string;
  label: string;
  href: string;
}

/** Pure presentational shell. Callers must supply authorized, server-backed data.
 * No invented metrics, no simulated runtime states and no control over receiver activation.
 */
export function MasterCommandVisualSystem({
  title, subtitle, release, logoInitial = "R", currentPath, navigation,
  kpis, workspaces, children,
}: {
  title: string;
  subtitle: string;
  release: string;
  logoInitial?: string;
  currentPath: string;
  navigation: MasterCommandNav[];
  kpis: MasterCommandKpi[];
  workspaces: MasterCommandLink[];
  children?: ReactNode;
}) {
  return (
    <section className="master-command-ui" aria-label={title}>
      <header className="mc-topbar">
        <div className="mc-brand"><span className="mc-brand-mark" aria-hidden="true">{logoInitial}</span>Rosevear Master Shell</div>
        <span className="mc-release">Build {release}</span>
      </header>
      <div className="mc-body">
        <nav className="mc-rail" aria-label="Master Shell workspaces">
          {navigation.map(item => <a className="mc-rail-item" href={item.href} key={item.id}
            aria-current={currentPath === item.href ? "page" : undefined}>{item.label}</a>)}
        </nav>
        <main className="mc-main">
          <div className="mc-hero"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
          {kpis.length > 0 ? <div className="mc-grid" aria-label="Operational instruments">
            {kpis.map(item => <article className="mc-kpi" data-tone={item.tone} key={item.id}>
              <div className="mc-kpi-icon" aria-hidden="true">{item.icon}</div>
              <div><span className="mc-kpi-label">{item.label}</span>
                <strong className="mc-kpi-value">{item.value}</strong>
                <span className="mc-kpi-detail">{item.detail}</span>
              </div>
            </article>)}
          </div> : <div className="mc-empty" role="status">No authorized operational snapshot available.</div>}
          <section className="mc-panel" aria-label="Workspace launcher">
            <h3>Workspaces</h3>
            {workspaces.length ? <div className="mc-launchers">
              {workspaces.map(item => <a key={item.id} className="mc-launcher" href={item.href}>
                <strong>{item.label}</strong><small>{item.detail}</small>
                {item.percent !== undefined && Number.isFinite(item.percent) ?
                  <div className="mc-meter" aria-label={`Completion ${Math.max(0, Math.min(100, item.percent))}%`}>
                    <span style={{ width: `${Math.max(0, Math.min(100, item.percent))}%` }} />
                  </div> : null}
                <span className="mc-status" data-tone={item.tone}>{item.status}</span>
              </a>)}
            </div> : <div className="mc-empty">No permitted workspaces.</div>}
          </section>
          {children}
        </main>
      </div>
    </section>
  );
}
