# Build 183 — Independent Reassessment Exception Renewal Continuity & QL-255/256 Real Signer Custody Readiness

**Source release** and **authenticated integration** are separate. A normal app deployment can be GREEN while QL-246 source proof, private signer custody, authenticated owner TEST and the future Windows relay remain blocked. No owner-approved test, private key or actual relay was installed in this build.

## Actual Build 182 public evidence used as source A candidate

- Repository: `RosevearCreations/rosevear-ai-hub`.
- Immutable **source A**: `9cac2ebcb386bec7dfcf2379acb0998c531c6aa1`.
- Completed GREEN **matching** `main` push CI: `https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40878851316`; GitHub reported `head_sha=A`, `head_branch=main`, `event=push`, `status=completed`, `conclusion=success`.
- Genuine QL-246 proof at that exact A: GitHub contents endpoint returned HTTP **404** after Build 182; B does not exist. These are public facts, not private source signing or witnessed gateway testing.

## Changes

1. Build 183 adds `Ql256SignerCustodyPanel` in the existing owner review workbench. It summarizes open Build 182 private reassessments, repeated original gaps and those older than seven days. It is read-only: no appointment, signer setup, owner approval, gateway request, Windows service or imported private claim can be falsely elevated.
2. `npm run integration:ql256:hub:check` inspects **only committed `.env.example`** and reports safe public template defaults, sensitive field **names/status only**, and unknown actual private runtime values. It does not read `.env`, Windows Credential Manager, vaults or CI secrets. It cannot tell whether a real signer exists.
3. `npm run integration:ql256:hub:check -- --public-get --source <40-hex-A>` independently queries only public GitHub Actions source CI and exact immutable raw proof path. Exact completed GREEN `main` push `head_sha=A` is mandatory. A `200` file at A is *not* automatically B or trusted provenance; 404 is factual. Network errors fail closed. There are no private gateway/relay requests.
4. `npm run integration:ql256:hub:check -- --public-key-file <approved-PUBLIC-PEM>` can derive the public Ed25519 SPKI SHA-256 from an operator-supplied **public key only**. It rejects private PEM and explicitly returns `UNTRUSTED_CANDIDATE`, not actual custodial attestation.
5. Unit regression checks cover redaction, missing/mismatched/failed CI, 404, actual fingerprint syntax and unauthenticated owner/relay HOLD. The CI docs-foundation job executes them. No synthetic test is presented as original proof.

## Real private actions that require people / approved systems

The public source has **no reliable view** into the Windows host's approved secret store, signer lifecycle or human identities. As of Build 183 source development, signer decision is **`SIGNER_STATUS_UNKNOWN`**, not a claim that a signer is absent. Actual app-specific key provisioning, separate custodian, independent witness, independent reviewer and owner TEST-only decision have not been verifiably established. See [QL-256 operator handoff](integration/QL256_HUB_REAL_SIGNER_CUSTODY_OPERATOR_HANDOFF.md).

Before final proof B, a real independent nonproduction test must be separately owner-authorized, original health/capability and seven target-side denial results observed and durable audit/rollback independently verified, then a fresh challenge signed with the genuine securely held key. Code fixtures do not qualify. All interfaces stay `DISCONNECTED / HOLD` meanwhile.

Proposed 24/7 relay remains *uninstalled*. It requires a different later host/service owner decision and isolated Windows service account, outbound-only protected transport, private scoped credentials, a kill switch and restore-to-disabled witness. Do not modify preexisting Windows startup tasks, cameras, MQTT, Home Assistant or vault data.

Next expected **Build 184 — QL-256 Private Signer Custody Decision Intake & Independently Witnessed Proof Publication Preparation (HELD)**.
