# Build 046 — Dual Private Access: LAN browser and remote Tailscale

Extension to Build 046, not a replacement for Build 047 (Backup and Restore). No new paid hosting or public endpoints. Updating GitHub DOES NOT turn on LAN access or Tailscale Serve.

## Access architecture

- Home PCs: browser -> https://YOUR_HUB_LAN_IP:8443 -> Caddy bound to a selected private Windows LAN interface, with explicit approved client IPv4 ranges in Caddy and Windows Firewall -> FastAPI/PWA at 127.0.0.1:8765.
- Away from home: APPROVED DEVICE with Tailscale client -> private https://HUB.YOUR_TAILNET.ts.net -> Tailscale Serve on HTTPS 443 -> FastAPI/PWA at 127.0.0.1:8765.
- Local Vite and Tauri interfaces continue unchanged. API, Home Assistant, MQTT, Ollama, camera services, and user data remain on their original interfaces. Never use Tailscale Funnel, public hosting, router port forwarding, wildcard CORS, or a FastAPI LAN bind.
- Both paths require existing Hub login, authorization, safe confirmation flows and audit recording. Neither grants automatic assistant access to the local network.

## Home LAN — no Tailscale client on every PC

1. On the server, find the actual IPv4 address of the Private home adapter:

   Get-NetIPAddress -AddressFamily IPv4 | Format-Table IPAddress, InterfaceAlias

   Do NOT select the Tailscale/VPN/VirtualBox address. If the Bell and Deco subnets differ, verify routing between them before including both. Do not grant guest or IoT subnets blindly.
2. Download the official Caddy Windows executable from https://caddyserver.com/download and save it as C:\Users\Ree\rosevearaihub\tools\caddy\caddy.exe. It runs ON THE SERVER ONLY. Do not put downloaded binaries or CA/private keys into GitHub.
3. In repository-root PowerShell run the check-only preflight, replacing examples with the selected server LAN IP and trusted LAN subnet:

   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-lan-https.ps1 -LanIPv4 "192.168.68.50" -TrustedLanCIDRs @("192.168.68.0/24")

   This deliberately makes NO network or firewall changes. The script requires the Caddy binary, healthy loopback-only Hub, functioning production web manifest, an active Private Windows adapter, enabled Private firewall with inbound blocking, unoccupied HTTPS port, and a deliberately selected private /24 through /32 client range.
4. After reviewing the preflight, open Administrator PowerShell and repeat the same command with -Enable. The opt-in action creates a generated data/lan-access/Caddyfile, validates it, adds one narrow named Windows Firewall allow rule for Caddy TCP/8443 on the chosen server IP and approved clients, then starts Caddy. A failed startup removes the newly created firewall rule.
5. Caddy uses its built-in local certificate authority (tls internal). On EACH approved home PC, import only the public Caddy CA root.crt into the trusted root CA store once; some browsers also have separate trust stores. Typical root path, under the Windows account running Caddy: %APPDATA%\Caddy\pki\authorities\local\root.crt. Consult caddy environ for the actual data directory. Never transfer the CA private KEY, and never click through TLS warnings. Trusting a root CA is a security decision; do so only on household-managed PCs.
6. On a DIFFERENT trusted home PC that does NOT have Tailscale, visit https://YOUR_HUB_LAN_IP:8443 and verify trusted HTTPS, Hub login, same-origin /api/v1/auth/status, PWA operation and appropriate role restrictions. From an unapproved subnet/device, confirm access fails. Access from the second home router requires working inter-subnet routing and explicit approval.
7. Rollback in elevated PowerShell, from the repository root:

   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-lan-https.ps1 -Disable

   Rollback stops only the process recorded/validated as this Hub's Caddy and removes only the Hub LAN HTTPS firewall rule. It does not stop API, MQTT, cameras, Tailscale, Home Assistant, or Ollama. Caddy does not automatically start after reboot; a separate opt-in service task is deferred until tested.

## Remote Tailscale — restrict the policy first

The earlier screenshot showed a permissive default grant: all tailnet users and devices to all tailnet users and devices on every port. This is NOT least-privilege. Grants/ACL permissions are additive: simply adding a more restrictive rule does not revoke broad access.

1. Use https://login.tailscale.com/admin/acls (or the admin Policies/JSON editor). Back up the existing policy, account for any other legitimate tailnet services, and REPLACE the allow-all grant instead of appending.
2. Use a grant limited to selected users/devices, this Hub destination IP, and TCP 443. This JSON is a TEMPLATE: replace placeholders before saving. Confirm user selectors in the admin console (GitHub identities use username@github).

   {
     "grants": [
       {
         "src": ["YOUR_APPROVED_GITHUB_USERNAME@github"],
         "dst": ["YOUR_HUB_TAILSCALE_IP"],
         "ip": ["tcp:443"]
       }
     ]
   }

   Avoid also retaining a wildcard self/member rule that reopens Hub access. Use the Tailscale Policy Tests UI to test allowed and denied paths. Tailnet access does not bypass Hub credentials.
3. Install/log into Tailscale on the server and SELECTED remote clients only, and enable tailnet HTTPS certificates. Run the already-available check-only preflight:

   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-tailscale-serve.ps1

4. Only after access policy review and negative tests, intentionally activate:

   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-tailscale-serve.ps1 -Enable

   This enables PRIVATE Tailscale Serve on HTTPS 443, never Funnel. Open the HTTPS URL printed by serve status from a second approved remote tailnet device, sign into Hub and verify same-origin API. An off-tailnet/unapproved device MUST fail. Roll back only the Hub's Serve entry using tailscale serve --https=443 off after reviewing existing Serve state.

## Scope and acceptance

- The two HTTPS listeners are independent. A LAN PC does not need the VPN client, but does need the Caddy CA certificate trusted once. Offsite clients need Tailscale.
- No automatic port opening occurs from git pull, production CI, app launch or API restart.
- LAN Caddy needs manual install, operator-selected IP/subnets, certificate trust, and explicit -Enable. Tailnet policy changes are performed only in the user's Tailscale administration account and are not made by the GitHub connector.
- Re-check if the LAN IP changes (DHCP), if Bell/Deco networks cannot route, or if the machine moves to a Public Windows profile.
- Camera media may need a later authenticated same-origin streaming bridge; never expose go2rtc ports as a shortcut.
- Green CI proves the released code builds, NOT that a trusted home device and an unapproved device have passed live access tests. Record separate LAN and offsite acceptance evidence.

Official references: https://caddyserver.com/docs/running ; https://caddyserver.com/docs/caddyfile/directives/tls ; https://caddyserver.com/docs/caddyfile/matchers ; https://tailscale.com/docs/reference/syntax/grants .
