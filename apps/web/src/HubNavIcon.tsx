/** Small self-contained outline icons; no icon-font/network dependency. */
const iconPaths: Record<string, string> = {
  Home: "m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2Z",
  Chat: "M4 5h16v12H9l-5 4V5Z M7 9h10 M7 13h7",
  Knowledge: "M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1m0-14c3-2 6-2 9-1v14c-3-1-6-1-9 1m0-14v14",
  Vault: "M12 2 4 6v6c0 6 4 9 8 10 4-1 8-4 8-10V6L12 2Z M9 12l2 2 4-4",
  Devices: "M5 5h14v14H5z M9 9h6v6H9z M9 1v4 M15 1v4 M9 19v4 M15 19v4 M1 9h4 M19 9h4 M1 15h4 M19 15h4",
  Cameras: "M3 7h4l2-3h6l2 3h4v13H3V7Z M12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  Business: "M3 7h18v14H3V7Z M8 7V4h8v3 M3 12h18 M10 12v3h4v-3",
  MQTT: "M12 20v-7 M9 20h6 M12 9a3 3 0 0 0-3 3m6 0a3 3 0 0 0-3-3M5 6a9 9 0 0 0 0 12M19 6a9 9 0 0 1 0 12 M8 8l4-4 4 4",
  Notifications: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Z M10 20a2 2 0 0 0 4 0",
  System: "M2 12h4l3-7 5 14 3-7h5",
  Workshop: "M3 21 16 8 M13 5l6 6 M15 3l6 6 M5 13 2 16l6 6 3-3",
  Automations: "M4 4h6v6H4z M14 14h6v6h-6z M10 7h4a4 4 0 0 1 4 4v3 M7 10v4a4 4 0 0 0 4 4h3",
  Confirmations: "M4 3h12l4 4v14H4V3Z M15 3v5h5 M8 13l3 3 5-5",
  Audit: "M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5",
  Secrets: "M8 11a4 4 0 1 1 7 2l-4 4H8v3H5v-4l5-5 M14 7h.01",
  Tools: "M4 20 15 9 M13 3a5 5 0 0 0 7 7l-4 4-6-6 3-5Z M4 16l4 4",
  Users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
};

export function HubNavIcon({ section }: { section: string }) {
  return <svg className="hub-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" aria-hidden="true">
    <path d={iconPaths[section] ?? iconPaths.System} />
  </svg>;
}
