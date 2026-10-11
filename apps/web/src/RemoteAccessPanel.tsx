/** Build 046 connection diagnostics, without revealing identity, IPs or tokens. */
export type RemoteConnectionMode =
  | "private-tailnet-https"
  | "private-lan-https"
  | "local"
  | "unsupported";

function privateLanIPv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part))) return false;
  const numbers = parts.map(Number);
  if (numbers.some((part) => part > 255)) return false;
  return (
    numbers[0] === 10 ||
    (numbers[0] === 172 && numbers[1] >= 16 && numbers[1] <= 31) ||
    (numbers[0] === 192 && numbers[1] === 168)
  );
}

export function remoteConnectionMode(origin: string): RemoteConnectionMode {
  const url = new URL(origin);
  if (url.protocol === "https:" && url.hostname.endsWith(".ts.net")) {
    return "private-tailnet-https";
  }
  if (url.protocol === "https:" && privateLanIPv4(url.hostname)) {
    return "private-lan-https";
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
      ) : mode === "private-lan-https" ? (
        <p role="status">
          Local-network HTTPS address detected. Verify this computer trusts the
          Hub server&apos;s private certificate authority and sign in normally.
          Only approved home-network ranges should reach this listener.
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
        At home, use the approved LAN HTTPS address with a browser; no Tailscale
        client is required on each home PC. Offsite, use Tailscale on the
        approved remote device. The server uses a separate loopback API and
        private access must be explicitly enabled by an administrator.
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
