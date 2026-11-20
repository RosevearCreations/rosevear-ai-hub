# Build 371 — Windows printer-PC USB enrollment and two-camera preview

**Source release:** No original workshop hardware was contacted from GitHub.
**Field acceptance:** HOLD until an owner runs the installer on the actual
Windows printer PC, enrolls the collector signer with the original Hub,
demonstrates two signed receipts, and independently checks the cameras.

## Physical architecture and source boundaries

The Ender 5 Pro is USB-connected to a separate Windows printer PC. That PC also
hosts two Epson printers, Ortur Laser Master 3, a scanner, Cricut Maker 3 and
USB cameras. There is **No Raspberry Pi** and **no OctoPrint installation**.
Do not confuse source telemetry with actual printer job progress.

The Hub already has Build 370 receipt verification and an owner-only dashboard.
Build 371 adds opt-in PnP registry hashes, serial port changes, two-receipt
reconciliation, a Windows setup helper, and a local snapshot viewer for the
two USB cameras. **Nothing opens the Ender 5 Pro's COM port.** No device controls,
new LAN listener, remote camera access or Windows service are introduced.

## Install from reviewed GitHub source on the original Windows printer PC

1. Open the exact protected-main repository
   https://github.com/RosevearCreations/rosevear-ai-hub/tree/main/scripts .
   Use Code > Download ZIP from the repository, extract to a private folder on
   the printer PC, and check the two included scripts:
   `scripts/setup-printer-pc371.ps1`,
   `scripts/printer-pc-collector370.py`,
   `scripts/printer-pc-camera371.py`.
   Do not download random installers from forums.
2. Install Python 3.11+ from https://www.python.org/downloads/windows/ .
   Open **Windows PowerShell as the regular Windows account** and change into
   the extracted repository's `scripts` folder.
3. Prepare the local venv, opt-in dependencies, and local signing key:

   ```powershell
   .\setup-printer-pc371.ps1 -Action Prepare -InstallCameraDependency
   ```

   This copies reviewed scripts under
   `$env:LOCALAPPDATA\Rosevear\PrinterPC`, installs `cryptography` and
   optional `opencv-python`, and generates a private Ed25519 signing key
   once. It does not enroll automatically, set a service, expose an Internet
   port or issue printer commands.
4. Inspect NTFS permissions of the private key folder; only the intended
   Windows operator and administrators should have read access. The private
   key stays on the printer PC. Confirm no cloud sync.
5. Inspect Windows source inventory locally before network use:

   ```powershell
   .\setup-printer-pc371.ps1 -Action Inventory
   ```

   Examine the COM ports and hashed Windows USB IDs. A stable hashed PnP
   instance can still change if Windows treats a moved USB device as a new
   instance; identical device names do not prove identity. Raw PnP IDs and
   camera pixels must not be sent to the Hub.
6. **First owner-supervised Hub enrollment:** On Ree's Windows Hub host,
   migrate database through revision 0032 (Build 370 already provides the
   receipt table) and set the server environment:
   `ROSEVEAR_WORKSHOP370_COLLECTOR_ID=printer-pc`,
   `ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PATH=<absolute public PEM file>`,
   `ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PIN=<SHA256 raw public key pin>`.
   Transfer only the `printer370-key.pem.pub.pem` file and verify the pin
   through a separate owner-approved path. Do not invent a public key or
   claim it was installed from the GitHub release.
7. Configure the existing Hub private HTTPS listener on **8443** with a
   certificate whose IP SAN matches the actual Hub LAN IPv4. Independently
   verify its CA and restrict firewall rules to the printer PC. Copy only
   that trusted CA PEM to the printer PC. The collector refuses public
   addresses, plaintext HTTP and redirects.
8. Owner-trigger one signed report (replace placeholders with real values):

   ```powershell
   .\setup-printer-pc371.ps1 -Action Push -HubReceiptUrl "https://<HUB_PRIVATE_IPV4>:8443/api/v1/workshop-gateway-370/receipt" -TrustedCaFile "C:\Private\hub-ca.pem"
   ```

   The URL example contains a placeholder; the script accepts only a real
   RFC1918 IPv4 and matching TLS certificate. On the Hub, sign in as owner
   and open Home Assistant > Workshop PC: inspect Build 370 receipt and
   Build 371 reconciliation. Repeat the owner-triggered Push after confirming
   the first receipt. Confirm two distinct nonces and identify changes.
   Replay must fail; stale source must become HOLD. Neither constitutes
   hardware field proof without independent observation.

## Two Ender 5 Pro cameras — no Pi or OctoPrint needed

Run **only on the printer PC**:

```powershell
.\setup-printer-pc371.ps1 -Action Cameras -CameraIndices "0,1"
```

Copy the printed `127.0.0.1:8766` private local URL into the browser on
that same printer PC. Choose Camera 0 / Camera 1. The preview captures one
still image every four seconds, opens **only one camera at a time** and
releases it after the frame. Nothing is recorded or streamed to the Hub.
This is a useful safe visual preview, **not OctoPrint motion monitoring**,
not a remote camera stream, and not proof of active print progress. If
another program holds a camera, close that program or use a different
physical camera index; never forcefully release it.

If the cameras need remote live streaming and approved photo retention, a
separate future camera-stream implementation must add authenticated private
transport, role-scoped consent, secure storage policy and end-to-end camera
tests. Do not expose the local port to the LAN or forward it on a router.

## Printer job progress without OctoPrint

Build 371 reports Windows queues and USB observations, not actual G-code
progress or machine temperatures. A later owner-approved **Windows-hosted
OctoPrint** instance could read the Ender 5 Pro controller and offer those
details to the existing Build 370 optional local GET adapter. Windows is
supported as a host by OctoPrint; a Raspberry Pi is not required. However,
OctoPrint becomes the serial-port owner and must not compete with Cura or
another sender while printing. Only one process should control the COM port.
For now the Rosevear collector never opens any machine controller port.

Official references:
- https://docs.octoprint.org/en/main/gettingstarted.html
- https://octoprint.org/download/

## Field acceptance checklist and uninstall

- Record Windows hostname locally, actual printer/camera connection labels,
  COM numbers, and which software currently owns them. Do not put usernames,
  USB serial numbers, private keys, or camera imagery in shared receipts.
- Run two independently signed and accepted observations; compare the exact
  USB identity hash and Windows port evidence. Unplug/replug only when no
  active print or laser work is running and after explicit owner consent.
- Confirm first-receipt vs stale state, exact receipt timestamps and source
  change; witness actual camera 0 and 1 images **on the printer PC**.
- Demonstrate failure safely: stop collector, confirm Hub view ages to HOLD.
  No automatic service is installed, so periodic telemetry is NOT promised.
- Confirm remote Master acknowledgement in a separately authorized ceremony;
  no receipt created by this build proves a Master-to-Master link.
- Stop the camera window with Ctrl+C. Removal: run
  `./setup-printer-pc371.ps1 -Action RemovalGuide`. Preserve server
  receipts/audit; decide whether to retain/rotate signing key before deleting
  the local folder.

The attached owner **Three Master Application Review** (2026-11-20)
describes a reusable local observation kit, bounded offline queue and a
separate fleet/operator path as proposed next-stage goals. This build
delivers the manual local-kit foundation and source comparison; it does
NOT claim an offline queue, live two-camera witness, real printer job feed,
seven-app live delivery or original-host installation.
