import { describe, expect, it } from "vitest";
import { createTrialReceipt, recordTrialObservation, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { createReconciliationReceipt } from "./ownerTrialReconciliation";
import { createIndependentReviewReceipt } from "./ownerIndependentReview";
import { deriveRepeatTrialRoutes, createFieldRoutingReceipt, parseFieldRoutingReceipt, recordSourceIdentityCheck,
  type SourceIdentityCheck } from "./ownerFieldRouting";

const env: TrialEnvironment = { installed_version: "0.0.5-build151", access: "private_lan", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const times = Array.from({ length: 23 }, (_, i) => `2026-10-25T${String(i).padStart(2, "0")}:00:00.000Z`);
const issue = (history: TrialObservation[], at: string) => recordTrialObservation(history, unknown,
  { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, at);
const pass = (history: TrialObservation[], at: string) => recordTrialObservation(history, env,
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner", witnessed: true }, at);
const capture = (history: TrialObservation[], prior: SourceIdentityCheck[], at: string,
  state: "confirmed_alias" | "identity_unknown" | "operator_mismatch" = "confirmed_alias", safe_alias = "asset_123abc",
  environment = env) => recordSourceIdentityCheck(history, prior, environment,
  { case_id: "cameras", identity_state: state, safe_alias, personally_witnessed: true }, at);

function route(history: TrialObservation[], checks: SourceIdentityCheck[], environment = env,
  imported = { trials: 0, checks: 0, reviews: 0 }) {
  return deriveRepeatTrialRoutes(history, checks, environment, [], [], imported).find(item => item.case_id === "cameras")!;
}

describe("Build 151 source change detection and manual trial routing", () => {
  it("starts with nine role-specific field HOLD routes and no physical success", () => {
    const rows = deriveRepeatTrialRoutes([], [], unknown, [], []);
    expect(rows).toHaveLength(9);
    for (const row of rows) {
      expect(row).toMatchObject({ field_acceptance: "FIELD_ACCEPTANCE_HOLD", priority: "EVIDENCE_INTAKE_REQUIRED" });
      expect(row.reasons).toEqual(expect.arrayContaining(["NO_OWNER_TRIAL", "WINDOWS_CONTEXT_UNKNOWN", "NO_IDENTITY_EVIDENCE"]));
    }
    expect(rows.find(row => row.case_id === "cameras")).toMatchObject({ section: "Cameras", recommended_owner: "camera_operator" });
    expect(rows.find(row => row.case_id === "home_assistant")).toMatchObject({ section: "Devices" });
    expect(rows.find(row => row.case_id === "mqtt")).toMatchObject({ section: "MQTT" });
    expect(rows.find(row => row.case_id === "windows")).toMatchObject({ section: "System" });
    expect(rows.find(row => row.case_id === "workshop")).toMatchObject({ section: "Workshop", recommended_owner: "workshop_operator" });
  });

  it("requires a witnessed trial and real installed Windows context for every new source check", () => {
    expect(() => capture([], [], times[1])).toThrow(/Record a trial/);
    const history = issue([], times[0]);
    expect(() => recordSourceIdentityCheck(history, [], env, {
      case_id: "cameras", identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: false,
    }, times[1])).toThrow(/personally witness/);
    expect(() => capture(history, [], times[1], "confirmed_alias", "asset_123abc", unknown)).toThrow(/Personally verify/);
    expect(() => capture(history, [], times[1], "confirmed_alias", "192.168.1.2")).toThrow(/non-sensitive/);
    expect(() => capture(history, [], times[1], "confirmed_alias", "front_door_camera")).toThrow(/non-sensitive/);
    expect(() => capture(history, [], times[1], "confirmed_alias", "asset_my-secret-token")).toThrow(/non-sensitive/);
    const checks = capture(history, [], times[1], "identity_unknown", "");
    expect(checks[0]).toMatchObject({ case_id: "cameras", trial_index: 0, safe_alias: null,
      identity_state: "identity_unknown", installed_version: "0.0.5-build151" });
    expect(route(history, checks).reasons).toContain("IDENTITY_UNKNOWN");
  });

  it("detects changed pseudonymous labels and routes real camera reinspection without claiming identity proof", () => {
    let history = issue([], times[0]);
    let checks = capture(history, [], times[1]);
    history = pass(history, times[2]);
    checks = capture(history, checks, times[3], "confirmed_alias", "asset_456def");
    expect(route(history, checks)).toMatchObject({ priority: "REPEAT_TRIAL_REQUIRED", section: "Cameras",
      recommended_owner: "camera_operator", field_acceptance: "FIELD_ACCEPTANCE_HOLD" });
    expect(route(history, checks).reasons).toContain("SOURCE_ALIAS_CHANGED");
    const consistent = capture(history, [], times[4]);
    expect(route(history, consistent).priority).toBe("EVIDENCE_INTAKE_REQUIRED");
    expect(route(history, consistent).field_acceptance).toBe("FIELD_ACCEPTANCE_HOLD");
  });

  it("preserves a same-trial contradiction even after a new confirmed checkbox", () => {
    const history = issue([], times[0]);
    let checks = capture(history, [], times[1], "operator_mismatch");
    checks = capture(history, checks, times[2], "confirmed_alias");
    expect(route(history, checks).reasons).toContain("SOURCE_IDENTITY_MISMATCH");
    const afterRetest = pass(history, times[3]);
    checks = capture(afterRetest, checks, times[4], "confirmed_alias");
    expect(route(afterRetest, checks).reasons).not.toContain("SOURCE_IDENTITY_MISMATCH");
  });

  it("never erases same-trial alias disagreement with successive agreeing checkboxes", () => {
    const history = issue([], times[0]);
    let checks = capture(history, [], times[1], "confirmed_alias", "asset_123abc");
    checks = capture(history, checks, times[2], "confirmed_alias", "asset_456def");
    checks = capture(history, checks, times[3], "confirmed_alias", "asset_123abc");
    checks = capture(history, checks, times[4], "confirmed_alias", "asset_123abc");
    expect(route(history, checks).reasons).toContain("SOURCE_ALIAS_CHANGED");
  });

  it("routes reopened issues after prior witnessed passes and assigns the case's follow-up role", () => {
    let history = pass([], times[0]);
    history = issue(history, times[1]);
    const repeat = route(history, []);
    expect(repeat).toMatchObject({ priority: "REPEAT_TRIAL_REQUIRED", recommended_owner: "camera_operator" });
    expect(repeat.reasons).toEqual(expect.arrayContaining(["REOPENED_AFTER_PASS", "ACTIVE_FINDING"]));
  });

  it("flags a stale source snapshot after later trial observations and a superseded installed Windows version", () => {
    let history = issue([], times[0]);
    const checks = capture(history, [], times[1]);
    history = pass(history, times[2]);
    expect(route(history, checks).reasons).toContain("IDENTITY_SNAPSHOT_STALE");
    const changed = { ...env, installed_version: "0.0.6-build151" };
    expect(route(history, checks, changed).reasons).toContain("INSTALLED_VERSION_SUPERSEDED");
    expect(route(history, checks, { ...changed, installed_windows_witnessed: false }).reasons).toContain("WINDOWS_CONTEXT_UNKNOWN");
  });

  it("never counts an imported trial or source check as fresh evidence", () => {
    const history = pass([], times[0]);
    const checks = capture(history, [], times[1]);
    const imported = { trials: history.length, checks: checks.length, reviews: 0 };
    expect(route(history, checks, { ...env, installed_windows_witnessed: false }, imported).reasons)
      .toEqual(expect.arrayContaining(["HISTORICAL_OWNER_TRIAL", "IMPORTED_IDENTITY_HISTORICAL", "WINDOWS_CONTEXT_UNKNOWN"]));
    const fresh = capture(history, checks, times[2]);
    expect(route(history, fresh, env, imported).reasons).toContain("HISTORICAL_OWNER_TRIAL");
    expect(route(history, fresh, env, imported).reasons).not.toContain("IMPORTED_IDENTITY_HISTORICAL");
  });

  it("round-trips bounded private Build 151 receipts with immutable closure HOLD and legacy compatibility", () => {
    const history = issue([], times[0]);
    const checks = capture(history, [], times[1]);
    const receipt = createFieldRoutingReceipt(env, [], history, [], [], checks, times[5]);
    expect(receipt).toMatchObject({ field_acceptance: "FIELD_ACCEPTANCE_HOLD", automatic_dispatch: "DISABLED",
      closure: "NOT_AUTHORIZED", identity_authenticity: "UNVERIFIED_OWNER_SAFE_ALIASES" });
    expect(parseFieldRoutingReceipt(JSON.stringify(receipt))).toMatchObject({ trial: receipt.independent_review.reconciliation.trial,
      handoffs: [], events: [], checks });
    const b148 = createTrialReceipt(env, [], history, times[5]);
    const b149 = createReconciliationReceipt(env, [], history, [], times[5]);
    const b150 = createIndependentReviewReceipt(env, [], history, [], [], times[5]);
    for (const legacy of [b148, b149, b150]) {
      expect(parseFieldRoutingReceipt(JSON.stringify(legacy)).checks).toEqual([]);
    }
  });

  it("rejects unsafe receipt injections, off-case pointers and falsified chronology", () => {
    const history = issue([], times[0]);
    const checks = capture(history, [], times[1]);
    const receipt = createFieldRoutingReceipt(env, [], history, [], [], checks, times[5]);
    expect(() => parseFieldRoutingReceipt(JSON.stringify({ ...receipt, closure: "GREEN" }))).toThrow(/unsafe field/);
    expect(() => parseFieldRoutingReceipt(JSON.stringify({ ...receipt, independent_review: receipt.independent_review.reconciliation.trial })))
      .toThrow(/complete validated Build 150/);
    expect(() => parseFieldRoutingReceipt(JSON.stringify({ ...receipt, password: "secret" }))).toThrow(/unsafe field/);
    expect(() => parseFieldRoutingReceipt(JSON.stringify({ ...receipt, source_checks: [{ ...checks[0], hostname: "privatehost" }] }))).toThrow(/sensitive/);
    expect(() => parseFieldRoutingReceipt(JSON.stringify({ ...receipt, source_checks: [{ ...checks[0], safe_alias: "10.0.0.8" }] }))).toThrow(/sensitive/);
    expect(() => parseFieldRoutingReceipt(JSON.stringify({ ...receipt, source_checks: [{ ...checks[0], trial_index: 99 }] }))).toThrow(/original trial/);
    expect(() => parseFieldRoutingReceipt(JSON.stringify({ ...receipt, source_checks: [checks[0], { ...checks[0], captured_at: times[0] }] })))
      .toThrow(/chronology/);
    expect(() => parseFieldRoutingReceipt(JSON.stringify({ ...receipt, source_checks: [{ ...checks[0], captured_at: "2026-10-24T23:00:00.000Z" }] }))).toThrow(/original trial/);
    expect(() => parseFieldRoutingReceipt(JSON.stringify({ ...receipt, source_checks: [null] }))).toThrow(/sensitive/);
  });
});
