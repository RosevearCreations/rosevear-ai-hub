# QL-339A — Windows private relay runner packaging before QL-340

**Current operational state: `DISCONNECTED / HOLD`.** This build delivers a usable Windows
installer for a **disabled Task Scheduler background runner**, plus a real loopback health
probe. It does **not** install a Windows Service Control Manager service, turn on a private
relay, issue keys, enroll a peer, send data to Comms Hub, or infer a signed owner decision.

This is an intentionally intermediate step. Cloudflare currently serves the public Comms
Hub disabled-preview assets, **not** a live signed private heartbeat receiver. The original
QL-338 library (`scripts/ql338-private-relay.mjs`) is not a daemon. No private receiver or
independently approved original issuer signature exists simply because source CI is green.

## What we verified on the actual owner's Windows machine (November 5, 2026)

- `main` source fetched from GitHub; local 28-commit lag corrected, inspection script present.
- `Get-NetTCPConnection` proved Python listening at **127.0.0.1:8765** and Node at
  **127.0.0.1:5173**. Tailscale showed `Running` but ACL, certificate pin, and trusted
  source workload are still unverified.
- `Rosevear AI Server Startup` scheduled task was `Ready`; its last task result was
  `4294770688` (`0xFFFD0000`, nonzero). Running processes do not by themselves prove the
  previous startup task succeeded, nor prove they match the freshly fetched GitHub source.
- PowerShell blocked `.ps1` execution under its current default policy. **Do not change
  Windows execution policy to use QL-339A.** All new owner commands use `node` directly.

## Step 1 — Read-only on-device verification (no administrative rights or secrets)

On **Rosevear AI Hub**, open PowerShell in `C:\Users\ree\rosevearaihub`:

```powershell
git status -sb
git pull --ff-only origin main
node scripts/ql339a-relay-agent.mjs --inspect
node scripts/ql339a-relay-agent.mjs --probe-local
node scripts/ql339a-relay-task.mjs --plan
```

Run `git pull` only when it can fast-forward. The existing untracked `package-lock.json`
is user data; never delete, overwrite, or stash it automatically. The probe makes only
one bounded GET to `http://127.0.0.1:8765/health`, checks an exact `Rosevear AI Hub`
identity, never follows redirects, and emits only sanitized status. A successful local
health probe is **not** Comms Hub authentication or Windows relay activation.

## Step 2 — Owner-supervised DISABLED task registration (optional)

Only after reviewing the release and deciding to prepare the Windows background runner,
the Windows user can invoke:

```powershell
node scripts/ql339a-relay-task.mjs --install --owner-confirmed-test-hold
node scripts/ql339a-relay-task.mjs --status
```

This creates **one new disabled, least-privilege, user-logon scheduled task** named
`Rosevear Comms Relay - TEST HOLD`. It uses `node.exe` directly, not a `.ps1` file or
an execution-policy bypass. It cannot run at boot before login and is **not** a Windows
SCM service. It does not modify `Rosevear AI Server Startup`, web, backend, Tailscale,
firewall, Caddy, MQTT or Home Assistant. It never overwrites a task by the same name.

Installation may require normal Windows scheduler authorization. If Windows rejects task
registration or the post-install task cannot be independently read back, stop and inspect
the result. No live activation command is provided in QL-339A. Even if an administrator
manually enables the disabled task, the Node agent exits with a nonzero HOLD code and
does not connect or dispatch.

To roll back **only that recognized disabled task**:

```powershell
node scripts/ql339a-relay-task.mjs --remove --owner-confirmed-remove
```

Unknown, enabled, or differently sourced tasks are refused; do not remove or disable
other startup tasks to make this registration succeed.

## What must happen before a genuine TEST handshake

1. Deploy an authenticated private Comms Hub receiver. The current static Cloudflare
   Worker does not implement a trusted Windows heartbeat API.
2. Independently enroll an Ed25519 device signer and original peer/public-key pin, with
   actual source owner and Comms owner **TEST-only** authorization. Never paste private
   keys, Tailscale hostnames/IPs, tokens or customer data into chat or GitHub.
3. Verify private TLS origin and Tailscale ACL isolation, least-privilege Windows storage
   ACLs and process identity, independent field witness, kill switch and recovery.
4. Execute a bounded, signed metadata-only `/health`/`/capabilities` test. Comms must
   persist an append-only original receipt and verify exactly one authenticated source;
   wrong-device/issuer/tenant, 401/403, replay, expiry and revoked credential must deny.
5. Only after these gates may the owner authorize a continuously running, separate
   Windows private service. Calls, texts, camera/device operations and customer exports
   remain independently disabled.

**Owner action needed after source promotion:** run Step 1 and share only the sanitized
state fields. No physical installation, policy change or trust enrollment is automated by
merging GitHub source.

Sources: [QL-338 private relay contract](../../scripts/ql338-private-relay.mjs),
[local server health API](../../server/src/rosevear_ai_hub/main.py),
[Microsoft Task Scheduler XML schema](https://learn.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-schema),
[Microsoft Task Scheduler command](https://learn.microsoft.com/en-us/windows/win32/taskschd/schtasks).
