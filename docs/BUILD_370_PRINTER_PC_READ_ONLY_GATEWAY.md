# Build 370 — Printer-PC read-only workshop gateway

## Corrected physical architecture

The Creality is USB-connected to a separate Windows printer PC, not attached to
the Rosevear AI Hub LAN directly. That printer PC also hosts two Epson printers,
an Ortur Laser Master 3, scanner, Cricut Maker 3 and USB cameras. Actual models,
COM assignments, USB serial chipset, jobs and camera capabilities have not been
confirmed. "Creality Pro 5" may refer to Ender 5 Pro; do not assume the model.

### Delivered source scope

- Opt-in, one-shot Python Windows collector in scripts/printer-pc-collector370.py.
- Read-only Windows registry serial COM interface mapping and Windows print queues.
  This does not open COM ports or prove equipment is online.
- Unverified notes for the devices listed above. They are not a USB discovery claim.
- Optional, owner-supplied OctoPrint key on the printer PC (environment variable
  ROSEVEAR_WORKSHOP370_OCTOPRINT_KEY) permits ONLY local
  http://127.0.0.1:5000/api/job and /api/printer GETs. Completion and nozzle/
  bed temperature are reported only if the data is available, and the collector
  never writes to the OctoPrint API or accesses the serial port itself.
- Exact-source Ed25519 signing, independently pinned Hub public key, bounded
  timestamp, replay nonce, audit receipt and owner-only reporting. Hub source
  age is shown and stale receipts are never live evidence.
- Owner-only workshop gateway dashboard embedded in Home Assistant view.
- HTTPS delivery exclusively to an owner-provided RFC1918 Hub IPv4 address,
  port 8443, exact receipt endpoint, pinned trusted CA PEM, no redirects.
- A database migration (Alembic 0032) for source observations.

### First owner-supervised installation — not yet done

1. On the printer PC install Python 3.11 or newer and the Python cryptography
   package. Obtain the reviewed collector from GitHub main.
2. Create a private folder, protected by NTFS Windows ACLs, for example
   C:\Private. Set permissions so only the collector's Windows user and
   administrators can read the private key. No sync or Git commit of the key.
3. Create a signing key on the printer PC:

       python scripts/printer-pc-collector370.py --init-key C:\Private\printer370-key.pem

   The script prints a public-key path and SHA-256 public key pin. Only the
   PUBLIC PEM is transferred independently to the original Hub host.
4. Apply the Hub migration through revision 0032. Configure three Hub
   environment values only after physical key custody and scope review:

       ROSEVEAR_WORKSHOP370_COLLECTOR_ID=printer-pc
       ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PATH=C:\Private\printer370.pub.pem
       ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PIN=<the printed SHA256 pin>

   The Hub public PEM filename must match the file actually transferred.
   Do not place any collector private key on the Hub.
5. Configure HTTPS on Hub port 8443 with an IP SAN matching the chosen Hub IPv4,
   an owner-approved printer-PC trust CA PEM and narrowly scoped Windows
   firewall permissions. A sample Hub IP is 192.168.1.20; do not assume it
   belongs to the real network. The collector requires the correct certificate.
6. Local inspection before networking:

       python scripts/printer-pc-collector370.py --key C:\Private\printer370-key.pem

   Review what USB COM numbers and printer queues are enumerated. No hardware
   job activity is reported without an already-authorized local OctoPrint.
7. Owner-supervised one-shot signed delivery:

       python scripts/printer-pc-collector370.py --key C:\Private\printer370-key.pem --ca-file C:\Private\hub-ca.pem --push-url https://192.168.1.20:8443/api/v1/workshop-gateway-370/receipt

   Replace the sample IPv4 address, CA file path and key paths with verified
   local values. Confirm source dashboard shows receipt and later stale state.
   No automatic scheduled task, Windows service or always-on agent is installed.

### COM port question

A powered USB hub supplies multiple physical USB connections; it does NOT
manufacture COM ports or multiplex one serial link. Each connected serial bridge
that the OS recognizes can be assigned its own COM number, commonly CH340/CH341
or standard USB CDC. Epson printer queues, Cricut, scanner and cameras usually
use other USB driver classes and often will not appear as COM ports.

Use Windows Device Manager, Ports (COM & LPT), then View/Devices by connection.
Check actual COM values one cable/device at a time. A serial COM number is
normally exclusive to one controller application, so do not add a serial-port
"splitter" for a running Creality or Ortur laser. If a second CH340 board is not
recognized, test each data cable, PC port, powered hub and stable device identity
individually; confirm the genuine chipset and driver from manufacturer resources.
The Ortur Laser Master 3 frequently uses standard USB serial connectivity.

### Acceptance and safety hold

Code and CI cannot confirm any actual printer-PC enrollment, private TLS link,
OctoPrint install, Creality job, temperature readings, laser software status,
Epson operation, Cricut Design Space activity, scanner or USB camera evidence.
They remain FIELD_HOLD pending owner-supervised first-run proof. No printing,
cutting, movement, heating, firmware, camera streams or laser actuation are
implemented. No silent polling of a COM port used by LightBurn or OctoPrint.

Rollback: stop manually invoking the collector; unset Hub collector ID and
signer environment, and redeploy last verified app source. Retain audit receipts
for owner review. Never delete records or execute hardware operations automatically.
