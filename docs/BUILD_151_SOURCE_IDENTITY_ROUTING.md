# Build 151 — Field Evidence Source-Identity Change Detection & Repeat Trial Routing

## Scope and acceptance boundary

Build 151 extends the owner/admin-only System workbench for the household Windows installation. It does **not** contact individual devices, re-pair cameras, trigger Home Assistant scenes, publish MQTT payloads, restart Windows services, dispatch a repair or certify physical operation. GitHub source GREEN is independent of actual Windows field acceptance. Every route remains `FIELD_ACCEPTANCE_HOLD`, and independent closure remains `NOT_AUTHORIZED`. The first-party personal Vault remains `0/6 · SECURITY HOLD`.

## Owner workflow

1. Open **System → Home operations field trial & follow-ups**, verify the actual installed Windows version and private access path in person, then choose one of the nine existing case types.
2. Use the existing module link to inspect the actual source without performing an unsafe action. Record a separately witnessed manual trial outcome with its next-action owner.
3. In **Source identity changes & repeat-trial routing**, select the exact case and classify the source as unknown, owner-confirmed alias or observed mismatch. Use a made-up `asset_` token, e.g. `asset_ab12cd`, **never** a real IP, MAC, serial, MQTT topic, location, hostname, camera stream or credential. No raw platform identifier is stored.
4. Review route reasons: missing/historical evidence, invalid or changed Windows context, changed pseudonym, observed mismatch, stale identity snapshot, new failure after a prior pass, active finding and independent review gaps. Token equality is never accepted as device identity proof.
5. Select **Select manual trial** to set the existing trial editor, or **Open [module] for inspection** to navigate safely. Route buttons do not create or dispatch tasks. Record a new observed outcome and review the independent evidence again.
6. Export the private Build 151 receipt if continued work across sessions is necessary. Imports of Builds 148–151 remain historical claims and reset fresh Windows witnesses; never attach private evidence to a public issue.

## Evidence contract

- `rosevear_owner_source_identity_routing`, `schema_version: 1`, wraps the complete validated Build 150 independent review receipt with a bounded `source_checks` array.
- Each check must point to a real same-case trial observation index and retain chronological timestamps, a sanctioned access category, validated version label, one of three source states, `witnessed_on_windows: true`, and either a made-up `asset_[a-z0-9]{6,12}` marker or `null` for unknown.
- At most 180 source checks, at most 460 KB per outer receipt, strict top-level and per-check key validation; all imported markers are historical and never counted as freshly observed.
- Source equality checks compare **owner-safe tracking markers**, not platform identities. A physically changed device with unchanged marker can only be flagged by manual mismatch classification. The system therefore cannot assert unchanged hardware or close a hold by comparison.
- A later trial observation makes a previous identity check stale; source version changes and renewed failure after a previous witnessed pass force repeat-trial routing. A fresh manual check does not erase prior history or independent reviewer contradiction.
- Receipt constants `field_acceptance=FIELD_ACCEPTANCE_HOLD`, `automatic_dispatch=DISABLED`, `closure=NOT_AUTHORIZED`, `identity_authenticity=UNVERIFIED_OWNER_SAFE_ALIASES` are immutable acceptance guards.

## Verification and release gates

- Source identity parser rejects malformed or extra keys, unsafe aliases, off-case pointers, forged closure states, source timestamps that predate their trial, and out-of-order evidence.
- Legacy Build 148, 149 and 150 private receipts import with an empty identity ledger; previously imported Build 151 checks remain historical until new installed-Windows witnessing and a new trial.
- Changed marker, explicit mismatch, reopened case, superseded installed version, unknown Windows context and imported prior pass produce manual HOLD routes. Tests do not claim real Windows, camera, MQTT, Home Assistant or workshop acceptance.
- Run web typecheck, focused and full Vitest suites and web production build locally. Then require all five GitHub Actions jobs (web, docs-foundation, backend, backup-windows, desktop-windows) to succeed on the feature PR, `dev` push, `dev`→`main` PR and final `main` push.

## Next expected

Build 152 — **Repeat-Trial Outcome Evidence Linking & Independent Hold Reassessment**, linking newly observed manual trial results to the exact routed reason while retaining reviewer and physical acceptance holds.
