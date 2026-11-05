# QL-339B — Windows device signer setup and first private TEST handshake

The local Hub health check already returned `LOCAL_HUB_HEALTH_VERIFIED_TEST_ONLY`. That proves Python is responding on the same Windows machine, **not** that Comms Hub is connected. The QL-339A `--inspect` result showed `HOLD_AGENT_NOT_AUTHORIZED_OR_PAIRED`. QL-339B does not bypass that hold or install a background connection. It supplies a **manual, encrypted Windows signer** for an independently authorized future private TEST handshake.

## Step 1 — Update safely on our Windows Hub

In PowerShell, use these commands one at a time. There is no `.ps1` execution-policy change or administrator prompt needed for the Node CLI.

```powershell
cd C:\Users\ree\rosevearaihub
git status -sb
git pull --ff-only origin main
node scripts/ql339a-relay-agent.mjs --probe-local
node scripts/ql339b-windows-signer.mjs --inspect
```

If `git pull` stops because of local changes, **stop and report the result**; do not reset or delete personal files such as the untracked `package-lock.json`. The signer must run on **this original Windows machine**, not a CI runner or public cloud service.

## Step 2 — Create and protect our original signer (explicit owner action)

Only if we are ready to enroll a real physical Windows device, run:

```powershell
node scripts/ql339b-windows-signer.mjs --enroll rosevear-windows-hub hub-probe hub-ql339b
```

Enter and repeat a **new passphrase of at least 16 characters** when prompted. Characters are hidden. Save that passphrase in our owner-controlled offline vault; do not paste it into ChatGPT, GitHub, an issue, or a browser. The utility attempts to restrict its Windows folder ACL before writing anything. If ACL verification fails, it refuses to write the key. It never overwrites an existing key.

Two files remain in `%LOCALAPPDATA%\RosevearAIHub\CommsRelay`:

| File | What it is | Where it goes |
| --- | --- | --- |
| `ql339b-hub.private.pem` | **AES-256-CBC passphrase-encrypted private key** | **Never share**; stays on Windows. |
| `ql339b-hub.public-candidate.json` | Public device ID, key ID, public key and SPKI hash | Can be sent through an approved private owner-review channel. |

We can run `node scripts/ql339b-windows-signer.mjs --inspect` afterward to confirm file presence without reading the secret. This step **does not activate the relay**, connect apps or authorize any phone/device action.

## Step 3 — Owner/security handoff we cannot complete with a code push

Before any remote connection is possible, the private Comms host needs all of these, verified independently:

1. A **real private receiver process**, run from `RosevearCreations/rosevear-comms-hub` QL-339B `runtimes/hub-relay/server.mjs`, with privately provisioned TLS-trusted Postgres access. The normal Comms Hub static website **is not** this receiver.
2. A Tailscale private `.ts.net` HTTPS endpoint and ACL that allows only this device to reach that receiver. No internet port forward.
3. A trusted public SPKI SHA-256 for the actual private HTTPS server certificate.
4. Actual Windows, TLS, Tailnet denial/allow, rollback and separate source/master owner witnesses. Two **different** pre-enrolled original owner authority keys must sign the same exact short-lived public enrollment record. A fake/CI key or this device's own key alone is not sufficient.
5. An authorized, separate private operator must review and record the resulting `REVIEWED_TEST` enrollment in the Comms Hub restricted Supabase database. Without that row, the receiver will return `HOLD_DEVICE_NOT_ENROLLED`.

**If we do not have the private receiver host and those original approvals, stop here.** No more normal app deployments will make the machine connected. Never post the private Windows key, passphrase, database connection string, or private tunnel credentials in chat.

## Step 4 — One bounded signed TEST POST, only after Step 3 passes

After we have been provided the independently verified real private endpoint and server TLS SPKI fingerprint, an owner can explicitly run:

```powershell
node scripts/ql339b-windows-signer.mjs --send-once https://OUR-PRIVATE-HOST.OUR-TAILNET.ts.net/private/ql339b/hub/heartbeat REAL_SERVER_TLS_SPKI_SHA256_HEX
```

The values in that command are **placeholders**, not addresses or credentials we already know. The utility checks the `.ts.net` hostname, TLS certificate, SPKI pin, exact route and bounded response. It prompts for the local signer passphrase without displaying it. It makes only **one** POST, and rejects redirects.

Expected *only after actual original-owner enrollment and successful field evidence*:

```json
{"state":"SIGNED_TEST_RECEIPT_RECORDED_FIELD_WITNESS_PENDING","connected":false,"relayActivated":false}
```

The recipient's receipt stays `DISCONNECTED / HOLD` until independent on-host + database comparison. Any 403/409/503 is **not** connected and must not be overridden. There is no automatic repeat, scheduler, live control, customer data or phone traffic in this step.

## Recovery and verification

- If the backend health probe fails, investigate the existing Hub on `127.0.0.1:8765` separately. Do not expose that local port to the internet.
- If the signer says `HOLD_WINDOWS_DIRECTORY_ACL_NOT_VERIFIED`, report that precise error before attempting a different install; do not temporarily remove Windows protection.
- If the receiver isn't available or the enrollment expires, keep `DISCONNECTED / HOLD`; do not create false evidence or reuse an expired owner authorization.
- To revoke, the Comms private operator appends a revocation entry and stops the receiver, then conducts independent readback.

Reference: [Comms Hub QL-339B protocol and operator checklist](https://github.com/RosevearCreations/rosevear-comms-hub/blob/main/docs/build-records/QL-339B_AUTHENTICATED_PRIVATE_RECEIVER_AND_TEST_HANDSHAKE.md).
