import { useState } from "react";

import { CardHelp } from "./CommandShell";

type ConsoleLane = "System" | "I.T." | "Management";
type ConsoleDestination = { title: string; description: string; source: string; anchor?: string; section?: string };

/** Navigation references only. No synthetic counts, background fetches or privileged actions. */
export const consoleDestinations: Record<ConsoleLane, ConsoleDestination[]> = {
  System: [
    { title: "Local diagnostics", description: "Review source-labelled health, stale readings and guided recovery.", source: "System · existing diagnostics", anchor: "hub-system-diagnostics" },
    { title: "Installed release review", description: "Compare installed-device evidence with the source release before owner sign-off.", source: "System · release acceptance", anchor: "hub-system-release" },
    { title: "Resource & local AI budget", description: "Request memory, storage and Ollama inventory snapshots on demand.", source: "System · owner-only measurements", anchor: "hub-system-resources" },
  ],
  "I.T.": [
    { title: "Connections & safeguards", description: "Inspect source access boundaries; QL-275 remains under review.", source: "I.T. · integration panel", anchor: "hub-system-connection" },
    { title: "Remote access", description: "Inspect private tailnet guidance without changing connections.", source: "I.T. · remote access panel", anchor: "hub-system-remote" },
    { title: "Access and audit", description: "Open the authorized audit workspace for real recorded events.", source: "I.T. · audit workspace", section: "Audit" },
  ],
  Management: [
    { title: "Owner review & findings", description: "Return to real theme findings and owner acceptance steps.", source: "Management · owner review", anchor: "hub-system-owner-review" },
    { title: "Approvals queue", description: "Review real pending confirmations, without executing them here.", source: "Management · confirmations workspace", section: "Confirmations" },
    { title: "Team access", description: "Manage authenticated local accounts in the existing user screen.", source: "Management · users workspace", section: "Users" },
    { title: "Workshop operations", description: "Open equipment, work and maintenance records.", source: "Management · workshop workspace", section: "Workshop" },
  ],
};

export function SystemConsoleRefresh({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [lane, setLane] = useState<ConsoleLane>("System");
  return (
    <section className="hub-command-console" aria-labelledby="hub-command-console-title">
      <header className="hub-command-console-heading">
        <div>
          <p className="eyebrow">Standard theme · owner command workspaces</p>
          <h2 id="hub-command-console-title">System, I.T. &amp; management</h2>
          <p>Real screens and review tools, grouped for quick access. Counts and service health are read in their own source panels.</p>
        </div>
        <CardHelp title="Console navigation">These cards open existing tools and recorded information. Switching categories does not sample, restart, approve or alter a system. Current runtime health must be checked in the destination panel.</CardHelp>
      </header>
      <div className="hub-command-console-tabs" role="group" aria-label="Console category">
        {(["System", "I.T.", "Management"] as const).map((category) => (
          <button key={category} type="button" aria-pressed={lane === category}
            onClick={() => setLane(category)}>{category}</button>
        ))}
      </div>
      <h3 className="hub-command-console-lane-heading">{lane} workspace shortcuts</h3>
      <div className="hub-command-console-grid">
        {consoleDestinations[lane].map((item) => (
          <article className="hub-command-console-card" key={item.title}>
            <span className="hub-command-console-provenance">{item.source}</span>
            <h4>{item.title}</h4>
            <p>{item.description}</p>
            {item.anchor ? <a href={`#${item.anchor}`}>Open {item.title}</a> : (
              <button type="button" onClick={() => onNavigate(item.section!)}>Open {item.title}</button>
            )}
          </article>
        ))}
      </div>
      <p className="hub-command-console-note">No demo statistics. QL-275 remains under review; this console grants no integration or relay permissions.</p>
    </section>
  );
}
