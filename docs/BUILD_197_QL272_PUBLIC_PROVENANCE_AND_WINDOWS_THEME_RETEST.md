# Build 197 — QL-272 Independent Proof-B Publication Recheck, Reviewer Evidence Provenance & Windows Theme Retest Disposition (HELD)

## Independent recheck of actual original source

On 31 October 2026 UTC, inspected **immutable Build 196 `main`** at `1ffb37c4eb750b4c8969b44f76692c74845179bb` through GitHub contents API:

- Required path: `docs/integration/ql246-source-proof.json`.
- Actual result: **HTTP 404 / NOT_FOUND**; no original signed proof B can be retrieved or validated from the authoritative path.
- Exact source CI: [five-job main GREEN, run 41153883513](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41153883513).
- No original signer signature, A→B commit ancestry, out-of-band pinned SPKI, independent private reviewer-custodian identity, scoped nonproduction tenant or credential, owner TEST-only authorization, authenticated gateway GET or private relay activation is independently verified.
- Integration remains **DISCONNECTED / HOLD** despite source CI GREEN.

## The actual QL-272 System I.T. provenance UI

Build 197 extends the established in-app QL-269→QL-271 evidence workspace with a **collapsed-by-default** QL-272 provenance disclosure. It is a bounded, local-only public metadata screen, not a remote service or private evidence vault. This keeps older source evidence visible without another full page of initially expanded controls. Opening the source/CI links is a manual browser action, never an authenticated gateway GET.

The JSON input allows **exactly 15 keys**, rejects anything above 4096 characters and clears raw input after screening:

| Key | Valid value |
| --- | --- |
| `schema` | `rosevear.ql272.public-reviewer-provenance.v1` |
| `repository` | `RosevearCreations/rosevear-ai-hub` |
| `observed_main_sha` | immutable Build 196 `main` above |
| `original_proof_path` | `docs/integration/ql246-source-proof.json` |
| `claimed_source_http_status` | integer `200` or `404`; `200` conflicts with independently observed source `404` |
| `candidate_proof_b_commit` | lowercase 40-hex claimed B commit (not verified ancestry) |
| `public_source_manifest_digest`, `public_reviewer_receipt_digest` | distinct lowercase 64-hex public fingerprints (not verified signatures) |
| `reviewer_provenance_claim` | `NOT_ATTESTED` or `REVIEWER_REPORTS_SOURCE_TRACED` |
| `independent_role_claim` | `NOT_ATTESTED` or `REVIEWER_REPORTS_SEPARATE_ROLES` |
| `reviewer_disposition` | `HOLD` or `RECHECK_REQUESTED` only |
| `observed_at` | integer epoch milliseconds; no future or older-than-10-minutes claims |
| `owner_test_authorization` | exactly `NOT_GIVEN` |
| `authenticated_gateway_gets` | integer `0` |
| `windows_private_relay` | exactly `OFF` |

The export is a fixed-field **HOLD** report. It compares public B against the in-memory QL-271 public claim if one exists, detects contradictory public `200` assertions and excludes input digests, signer material, human identities, arbitrary strings and raw JSON from its output. Even correct formatting and matching public claims **cannot certify** the original signature, reviewer provenance, out-of-band pin or private custody. The authentic signer/custodian must resolve those outside the application in an approved private channel.

## Windows Theme owner retest

The real Standard Theme panel (System workspace) already provides five owner-observed on-device tests: navigation, resizing, keyboard access, real status source labels and refresh/reconnect. Build 197 adds a **separate retest disposition only for previously failed checks**:

1. Owner selects the actual local Windows Hub or remote Windows client as the coarse test location. Other browser environments cannot record a Windows retest.
2. The owner records `not_retested`, `issue_persists` or `owner_reports_improvement` for each originally failed check after personally using the actual screen again.
3. Changing the device context resets all original observations and retests; changing an original finding resets that check's retest. Admin sessions cannot impersonate owner observations.
4. The session-only report explicitly distinguishes pending, persistent issues or owner-reported improvement; **even all improved never equals engineering fix or independently witnessed Windows acceptance**.

No hostname, address, serial, browser fingerprint, camera data, screenshot, credential, secret or actual server action is collected. No permanent owner acceptance receipt or backend record is created.

## Release tests and boundaries

- Run `npm run web:typecheck`, `npm run integration:ql272:hub:test`, `npm run web:build` and the full frontend suite.
- GitHub CI: focused QL-272 frontend tests plus independent `web`, `backend`, `docs-foundation`, `backup-windows`, `desktop-windows` jobs on feature, `dev`, production PR and exact `main` push.
- Windows desktop CI builds the package; it does not install/update the physical Hub or independently observe our household machine.
- Backend, Windows task scheduler, Home Assistant, MQTT, cameras, vault and all real integration credentials are unchanged.
- Authenticated gateway GET count = **0**, conditional slot unscheduled, owner TEST authorization NOT GIVEN and relay OFF.

Next proposed: **Build 198 — QL-273 Original Proof-B Origin Verification, Independent Custodian Evidence Gap Closure & Windows Retest Acceptance Follow-Up (HELD).**
