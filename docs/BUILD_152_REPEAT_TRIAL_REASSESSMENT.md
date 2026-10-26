# Build 152 — Repeat-Trial Outcome Evidence Linking & Independent Hold Reassessment

## Scope and boundaries

The owner/admin System workbench now links a new, personally witnessed Build 148 trial result back to the exact earlier Build 151 route reason, previous trial index, optional made-up `asset_` tracking alias, referenced source check and manually inspected installed Windows version. These are **unverified owner claims**, not hardware identity attestation or evidence that the actual household PC has been updated. No device is queried, paired, restarted or operated by this feature.

GitHub source CI GREEN **must not** be confused with physical Windows/Home Assistant/MQTT/Frigate/Ollama field acceptance. All outcomes remain `FIELD_ACCEPTANCE_HOLD`; all independent reviewer results remain on independent review HOLD; closure always remains `NOT_AUTHORIZED`. The first-party password/document Vault remains `0/6 · SECURITY HOLD`.

## Private owner workflow

1. In System → owner field trial, examine the Build 151 source-identity routing reason and inspect its existing safe source/module without a control action.
2. Personally verify the installed Windows version and private access category, and record a **later** witnessed field trial for that exact module. Existing imported trial history does not count as a newly witnessed result.
3. Under **Repeat-trial links**, choose the case and its historical route reason. A valid link references the immediately previous observation for the same module and the latest new trial. A source-check pointer is recorded only if the previous observation has an eligible owner-safe source check.
4. Separately inspect the reviewer classification for the seven Build 150 criteria. The comparison shows earlier versus new-observation reviewer claims, missing/current/imported evidence, source and version gaps, unresolved contradictions and newer superseding trials.
5. With an explicit personal review confirmation, record a private reassessment note (`reviewer_gaps_hold`, `repeat_trial_requested`, or `packet_prepared_only`). The latter requires all seven fresh present claims, a separately attested reviewer, matching made-up alias, current installed Windows witness and a prepared historical manual handoff. **Even then the packet is unverified and does not certify or close anything.**
6. Download the private Build 152 JSON receipt to preserve the chain. The original Build 148–151 receipts also import; their data, plus any imported Build 152 links and reassessments, are always historical and require a new owner-observed Windows trial before fresh acceptance work.

## Data and validation

- Receipt kind `rosevear_repeat_trial_reassessment`, `schema_version: 1`, wraps a fully validated Build 151 `source_routing` receipt containing the earlier review, handoff and owner-trial chain.
- `trial_links` (max 200) are strictly enumerated, non-secret records of `case_id`, `baseline_trial_index`, `retest_trial_index`, `route_reason`, `source_check_index` or null, `source_alias` or null, `installed_version`, `linked_at` and `witnessed_on_windows: true`.
- `reassessments` (max 200) cite exact link indices, a fixed reviewer status, witnessed checkbox, optional separate-reviewer claim, timestamp and immutable HOLD/closure fields.
- Validation rejects unknown fields, arbitrary hostnames/paths/URLs/secrets, fabricated closure/GREEN, invalid aliases, off-case/missing/reversed indices, duplicate exact route links, corrupted review links, changed source evidence pointers, missing source wrappers and chronology violations. Import has a 580 KB bound and does not replace existing browser-session history on parsing failure.
- Historical aliases are intentionally not physical attestation. A changed or contradictory alias on the new trial, a reviewer contradiction against the same observation, missing fresh independent evidence, an imported link, absent installed-Windows witness or changed version blocks even packet-prepared-only readiness.
- All fields remain private to the browser until deliberate download. No background polling, repair dispatch, Home Assistant scene, MQTT publish, camera operation, Windows service action, public exposure or Vault mutation is performed.

## Verification expectations

- `npm run web:typecheck`
- `npm exec --workspace apps/web vitest run src/ownerRepeatTrialReassessment.test.ts src/RepeatTrialReassessmentPanel.test.tsx`
- Full web Vitest and production web build, followed by reviewed GitHub `dev` and `main` CI checks.
- Real household Windows field acceptance remains separately supervised, not automated or asserted by these tests.

## Next proposed build

Build 153 — **Independent Reassessment Exception Aging & Owner Evidence Follow-Up**, surfacing overdue/manual gap follow-ups without enabling any closure or physical operation.
