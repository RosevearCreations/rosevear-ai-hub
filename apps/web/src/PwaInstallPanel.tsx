import { useEffect, useState } from "react";

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

export function pwaConnectionNotice(online: boolean, secure: boolean): string {
  if (!secure) return "Installation requires localhost or HTTPS; plain HTTP on a LAN address is not secure.";
  if (!online) return "Offline: private data and device controls are unavailable until the Hub reconnects.";
  return "Online. Installation keeps the app launcher on this device, not your private Hub data.";
}

export function PwaInstallPanel() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [notice, setNotice] = useState("");
  const [instructions, setInstructions] = useState(false);
  const [busy, setBusy] = useState(false);
  const secure = window.isSecureContext;
  useEffect(() => {
    const checkInstalled = () =>
      setInstalled(window.matchMedia?.("(display-mode: standalone)")?.matches ?? false);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setNotice("The Hub was installed on this device.");
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    checkInstalled();
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function install() {
    if (!promptEvent || busy) return;
    // Must run directly from a user click.
    setBusy(true);
    setPromptEvent(null);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setNotice(
        choice.outcome === "accepted"
          ? "Install accepted. Your browser will finish adding the Hub."
          : "Install dismissed. You can install later from the browser menu.",
      );
    } catch {
      setNotice("Browser installation did not complete. Try the browser install menu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pwa-install-panel" aria-label="Install Hub application">
      <strong>Install the Hub</strong>
      <small role="status">{pwaConnectionNotice(online, secure)}</small>
      {installed ? (
        <span className="pwa-install-label">Installed app mode</span>
      ) : secure && promptEvent ? (
        <button type="button" onClick={() => void install()} disabled={busy}>
          {busy ? "Installing…" : "Install app"}
        </button>
      ) : (
        <button type="button" onClick={() => setInstructions((value) => !value)} aria-expanded={instructions}>
          Installation help
        </button>
      )}
      {instructions ? (
        <div className="pwa-install-help">
          <small>
            On Windows Chrome/Edge: open the browser menu and select Install Rosevear AI Hub
            (or Apps → Install this site as an app). On Android: Install app or Add to Home screen.
            On iPhone/iPad Safari: Share → Add to Home Screen.
          </small>
          <small>
            Use this PC's http://127.0.0.1:5173 address or an HTTPS site. The installed app
            still requires the local server, network access, and your normal account login.
          </small>
        </div>
      ) : null}
      {notice ? <small role="status">{notice}</small> : null}
    </section>
  );
}
