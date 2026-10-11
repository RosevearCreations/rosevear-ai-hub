/** Build 046 connection diagnostics, without revealing identity, IPs or tokens. */
export type RemoteConnectionMode = "private-tailnet-https" | "local" | "unsupported";

export function remoteConnectionMode(origin: string): RemoteConnectionMode {
  const url = new URL(origin);
  if (url.protocol === "https:" && url.hostname.endsWith(".ts.net")) {
    return "private-tailnet-https";
  }
  if (["localhost", "127.0.0.1", "tauri.localhost"].includes(url.hostname)) {
    return "local";
  }
  return "unsupported";
}

export function RemoteAccessPanel() {
  const mode = remoteConnectionMode(window.location.origin);
  return (
    <section className="panel" aria-label="Private remote access">
      <h2>Private remote access</h2>
      {mode === "private-tailnet-https" ? (
        <p role="status">
          Connected through a private Tailscale HTTPS address. Hub sign-in and
          all device/confirmation permissions still apply.
        </p>
      ) : mode === "local" ? (
        <p role="status">
          Local access is active. The server can be shared with approved tailnet
          devices after an administrator explicitly enables Tailscale Serve.
        </p>
      ) : (
        <p role="status">
          This address is not the recommended private HTTPS tailnet origin.
          Do not expose the Hub through public hosting, port forwarding or Funnel.
        </p>
      )}
      <p>
        Private remote setup: install Tailscale on the Windows server and
        the remote device, connect both to your trusted tailnet,
        then follow Build 046's opt-in PowerShell setup guide.
      </p>
      <p>
        Camera streaming and voice output require separate device/browser
        checks. Offline apps cannot queue home or business commands.
      </p>
      <small>
        No connection key, tailnet user identity, camera credential or external
        IP address is displayed or stored here.
      </small>
    </section>
  );
}
