# Build 268 — Authenticated Original Receiver Acceptance, Independent Trial Authorization and First GET Gate

## Release status is not connection status

Build 268 adds an offline verification panel beneath the existing signed Build 263–267 evidence
chain. The UI checks a genuine original private receiver operator and separate Jack-signed readback
claim plus Ree/Jack's **new**, short-lived one-GET owner grant. An imported signed JSON is a
candidate **only**, not independent authentication of the physical host, database, TLS endpoint,
private GET handler or owner. The client never dispatches a GET. `CONNECTED`, receiver activation,
an active session and a successful live read are never inferred from a GitHub green build.

**Important protocol distinction:** The actual QL-339B `runtimes/hub-relay/private-receiver.mjs`
in the Comms source currently handles only `POST /private/ql339b/hub/heartbeat` on loopback.
Its 202 held receipt is not a health GET response. The proposed nonproduction
`GET /api/integration/v1/health` must be separately implemented, deployed and independently
authenticated on the intended **private** host before any owner-approved GET trial. Never
change a request path or send an unrecognized GET merely to make a test green.

## Practical steps for Ree and Jack to authenticate the original AI Hub

1. **Ree's Windows machine:** open PowerShell in `C:\Users\ree\rosevearaihub`, check `git status --short`
   and preserve local files. Then `git fetch origin main`, `git switch main`, `git pull --ff-only origin main`.
   If Git refuses due to changes, STOP; never reset, clean or delete `package-lock.json`.
2. **Read-only local health and installed source:** run
   `node scripts/ql339a-relay-agent.mjs --probe-local` and
   `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-authority-264.ps1 -Stage before`.
   A local healthy API or scheduled recovery task is not proof of release-to-process identity.
   If Windows denies inspection, remain HOLD instead of modifying global execution policy or
   stopping healthy services.
3. **Ree's physical signer:** run `node scripts/ql339b-windows-signer.mjs --inspect`.
   If both files are absent and the owner expressly chooses a new identity, run
   `node scripts/ql339b-windows-signer.mjs --enroll rosevear-windows-hub hub-probe hub-ql339b`.
   Enter a unique 16+ character passphrase in the private terminal. Never export the encrypted
   private PEM or passphrase. Existing signer keys must not be overwritten. On Windows, the public
   candidate is `%LOCALAPPDATA%\RosevearAIHub\CommsRelay\ql339b-hub.public-candidate.json`.
4. **Jack's separate machine:** compare the original Windows install/process fingerprints,
   source public candidate and independently witnessed issuer identity against the real
   original machine via a private, out-of-band channel. Jack must not sign a copied CI fixture
   or approve himself as both original source owner and Comms master owner.
5. **Identify the actual Comms private receiver host:** a real Comms operator, not the public
   website, must have the `rosevear-comms-hub` checkout on an authorized private server,
   protected private `.ts.net` TLS endpoint, independently verified certificate SPKI pin,
   Tailnet ACL restricted to Ree's device, and a rollback/revocation plan.
6. **Enroll the physical source in the correct private Comms database:** using a separately
   authenticated private server operator, inspect `master_hub_device_enrollments_ql339b` and
   `master_hub_device_revocations_ql339b`. Build the actual 30-minute maximum signed
   `rosevear.hub.relay.enrollment.v1` record with the Windows public device key and proof digests.
   Source original owner and **Comms master original owner** sign it independently with their
   pre-enrolled separate signing keys. Only the approved operator may insert a real verified
   `REVIEWED_TEST` enrollment; never create a synthetic row, grant `anon` access, or place a
   service-role/DB secret in browser code. If the database or owner pins cannot be identified,
   STOP / HOLD. The normal AI Hub, Rosie and iCamp Supabase projects do not substitute for this
   actual Comms receiver trust registry.
7. **Bring up only the authorized private heartbeat receiver:** a Comms operator uses its
   documented `npm ci --prefix runtimes/hub-relay` and
   `node runtimes/hub-relay/server.mjs --serve /private/path/to/public-authority-pins.json`
   from an approved host with trusted server-side PostgreSQL credentials. It binds
   `127.0.0.1:8788` and requires the least-privilege `ql340c_private_receiver` database role.
   Do not expose the loopback listener publicly or use browser `VITE_` secrets.
8. **First actual bounded pairing heartbeat:** only after step 6 and the private TLS/ACL check,
   Ree can knowingly run the existing signer command with independently verified values:

   ```powershell
   node scripts/ql339b-windows-signer.mjs --send-once https://VERIFIED-PRIVATE-HOST.VERIFIED-TAILNET.ts.net/private/ql339b/hub/heartbeat VERIFIED_TLS_SPKI_SHA256_HEX
   ```

   The host and fingerprint above are **placeholders**. Never copy them literally or paste a
   credential into chat. The expected successful receiver receipt is still
   `SIGNED_TEST_RECEIPT_RECORDED_FIELD_WITNESS_PENDING`, `connected:false`. The original private
   operator and Jack independently read back the actual stored receipt, nonce and revocation.
9. **Only then, prepare a separate health GET:** the original private operator first confirms
   that `GET /api/integration/v1/health` is genuinely deployed on a distinct private handler,
   with correct original receiver/TLS source pins, allowlisted source/tenant, a new UNUSED nonce,
   exact method/path, strict max-one semantics and proven stop/revocation. Capture signed
   Build 268 original-host readback `rosevear-comms-original-authenticated-readback-268/v1`.
   Jack signs his independent observation of the *same* readback. The privately verified
   deployed GET handler SHA-256 must be included; the QL-339B POST-only handler is not valid.
10. **Ree and Jack decide separately:** if and only if satisfied, issue the bounded Build 268
    owner candidate `rosevear-comms-separate-one-get-grant-268/v1`, with a fresh nonce different
    from the consumed historical one, `GET /api/integration/v1/health`, max one request, and
    a 10-minute maximum decision interval. This still requires private receiver operator
    authorization and an actual independently verified nonce ledger before any live call.
11. **Import the two Build 268 JSON files** under System → Process Evidence → Build 267 and
    choose **Verify original receiver identity and one-GET safety gate offline**. The panel
    mathematically rechecks every signed 263–267 receipt first. Any mismatch is STOP / HOLD.
    Even an accepted candidate stays `SIGNED_ONE_GET_OWNER_GRANT_CANDIDATE_PRIVATE_RECEIVER_HOLD`
    until the external operator verifies trust and independently performs the first live GET.
12. **After the future controlled GET:** the private Comms operator records the true signed HTTP
    result, immutable one-use nonce audit, revocation and immediate receiver OFF state. Jack
    independently confirms it. Only those genuine fresh receipts can feed a later owner
    connection-state decision. No customer communications, phone line, automation or devices
    are authorized by Build 268.

## Owner authority and project access

- The ChatGPT GitHub connector can review the source repositories and promote code. It is **not**
  an authenticated session to the private Comms receiver.
- The connected Supabase project lists available here do not currently contain a project
  explicitly named Rosevear Comms Hub. Do not infer that an unrelated project is its trusted
  enrollment database; ask the actual Comms owner to identify the right private project/host
  through an authenticated out-of-band channel.
- If the current operator/host is unknown, STOP here. A new build cannot manufacture original
  authority, install a private receiver, or provide the owner signature.

## Verification / security contract

All signed fields use strict schemas, exact allowed field sets, pinned role-specific Ed25519
signature checks, signed parent hash chains, 32-lowercase-hex fresh nonce, and UTC whole-second
timestamps. The new grant has max-one GET and expires within ten minutes; previous signed
planning expires within thirty minutes. Invalid signer, replay, expired grant, changed handler,
changed source/TLS pin, POST, customer action, database write, additional request, or
`CONNECTED` is rejected.

The Build 268 reviewer always returns:

- Original host externally authenticated: **false**, pending actual private evidence.
- Deployed GET handler independently authenticated: **false**.
- Separately authorized live trial: **false**. GET executed: **false**.
- Receiver activated: **false**. Remote requests: **0**.
- Connection state: **DISCONNECTED / HOLD**.

Run `node scripts/build-268-contract.test.mjs`, focused Build 263–268 Vitest tests,
`npm run web:typecheck` and `npm run web:build`; all protected GitHub source, production PR
and post-merge `main` checks must pass before **release** GREEN.

### Trusted references

- Original Comms QL-339B operator source:
  https://github.com/RosevearCreations/rosevear-comms-hub/blob/main/docs/build-records/QL-339B_AUTHENTICATED_PRIVATE_RECEIVER_AND_TEST_HANDSHAKE.md
- Receiver code (POST-only):
  https://github.com/RosevearCreations/rosevear-comms-hub/blob/main/runtimes/hub-relay/private-receiver.mjs
- [Supabase Postgres least-privilege roles](https://supabase.com/docs/guides/database/postgres/roles)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
