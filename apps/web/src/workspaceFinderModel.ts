/** Build 270 — task words are navigation hints, never commands or permission grants. */
const WORKSPACE_HINTS: Record<string, { description: string; terms: readonly string[] }> = {
  Home: { description: "Overview and daily status", terms: ["dashboard", "overview", "start"] },
  Chat: { description: "Ask the local AI assistant", terms: ["assistant", "ask", "conversation", "ai"] },
  Assistant: { description: "Approved private manuals and workshop questions", terms: ["manuals", "approved sources", "offline evidence", "private ai", "equipment guidance"] },
  Knowledge: { description: "Notes, documents and research", terms: ["notes", "documents", "research", "library"] },
  Vault: { description: "Private vault planning", terms: ["secure storage", "private files"] },
  Devices: { description: "Home Assistant and smart devices", terms: ["lights", "sensors", "smart home", "home assistant"] },
  Cameras: { description: "Camera inventory and video", terms: ["video", "camera wall", "feeds"] },
  Business: { description: "Connected business workspaces", terms: ["companies", "operations", "businesses"] },
  MQTT: { description: "MQTT broker and device messages", terms: ["broker", "mqtt messages"] },
  Notifications: { description: "Alerts and reminders", terms: ["alerts", "reminders", "inbox"] },
  Groceries: { description: "Shared household groceries and pantry", terms: ["shopping", "pantry", "food", "pickup", "grocery", "list"] },
  Calendar: { description: "Private family calendar, chores, and in-app reminders", terms: ["appointments", "household", "tasks", "chores", "schedule", "reminders", "supplies"] },
  "Boot Recovery": { description: "Owner Windows startup stages, recovery and pre-login witness review", terms: ["windows reboot", "boot", "startup", "recovery", "caddy", "tailscale", "ollama", "virtualbox", "dependencies"] },
  "Security Custody": { description: "Owner zero-trust sessions, encrypted copy custody, key-rotation and MFA holds", terms: ["zero trust", "sessions", "security", "backup restore", "custody", "mfa", "key rotation", "sbom"] },
  "Search & Help": { description: "Help and searchable guides", terms: ["help", "guides", "manual", "support"] },
  System: { description: "Health, diagnostics and updates", terms: ["status", "health", "diagnostics", "update", "backup", "restart"] },
  Workshop: { description: "Workshop jobs and maintenance", terms: ["projects", "equipment", "maintenance", "materials"] },
  Automations: { description: "Rules and automation history", terms: ["rules", "triggers", "schedules"] },
  Users: { description: "Local accounts and roles", terms: ["accounts", "members", "roles", "permissions"] },
  Tools: { description: "Local AI tools", terms: ["utilities", "ai tools"] },
  Confirmations: { description: "Pending owner approvals", terms: ["approvals", "decisions"] },
  Audit: { description: "Security and activity audit", terms: ["audit log", "activity", "events"] },
  Secrets: { description: "Secret management", terms: ["credentials", "keys", "secret management"] },
};

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/** Only the caller's allowed sections can appear, including for alias matches. */
export function filterShellSections(sections: readonly string[], query: string): string[] {
  const term = normalized(query);
  if (!term) return [...sections];
  return sections.map((section, index) => {
    const name = normalized(section);
    const aliases = WORKSPACE_HINTS[section]?.terms ?? [];
    const rank = name.startsWith(term) ? 0 : name.includes(term) ? 1 :
      aliases.some(alias => normalized(alias).includes(term)) ? 2 : -1;
    return { section, index, rank };
  }).filter(result => result.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(result => result.section);
}

export function workspaceFinderHint(section: string): string {
  return WORKSPACE_HINTS[section]?.description ?? "Open workspace";
}
