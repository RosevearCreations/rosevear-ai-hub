import { describe, expect, it } from "vitest";
import { createCustodyCandidateReceipt, recordCustodyCandidate,
  type CustodyCandidateInput } from "./ql256CustodyCandidate";

const blank: CustodyCandidateInput = { signer_decision: "SIGNER_STATUS_UNKNOWN",
  signer_key_id: "", public_spki_sha256: "", registry_snapshot_sha256: "",
  custodian_receipt_id: "", witness_receipt_id: "", reviewer_receipt_id: "" };
describe("Build 184 private signer custody decision candidate intake", () => {
  it("records an honest real operator status candidate without granting trust or TEST", () => {
    const notes = recordCustodyCandidate([], { ...blank, signer_decision: "SIGNER_NOT_PROVISIONED" }, true, true);
    const result = createCustodyCandidateReceipt(notes);
    expect(result.independent_custody).toBe("NOT_VERIFIED");
    expect(result.candidates[0].origin_authenticated_out_of_band).toBe(false);
    expect(result.candidates[0].relay_installed_or_started).toBe("NO");
    expect(result.candidates[0].owner_test_decision).toBe("NOT_GIVEN");
  });
  it("allows actual opaque public-only evidence candidates with genuinely distinct receipt references", () => {
    const input: CustodyCandidateInput = { signer_decision: "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED",
      signer_key_id: "signer001", public_spki_sha256: "a".repeat(64),
      registry_snapshot_sha256: "b".repeat(64), custodian_receipt_id: "custody01",
      witness_receipt_id: "witness01", reviewer_receipt_id: "reviewer01" };
    const notes = recordCustodyCandidate([], input, true, true);
    expect(createCustodyCandidateReceipt(notes).candidates[0].independently_witnessed).toBe(false);
  });
  it("rejects copied receipt IDs, secret-like input, unprovisioned keys and unsigned claims", () => {
    expect(() => recordCustodyCandidate([], blank, false, true)).toThrow(/acknowledgement/);
    expect(() => recordCustodyCandidate([], { ...blank, custodian_receipt_id: "same1234",
      witness_receipt_id: "same1234" }, true, true)).toThrow(/share/);
    expect(() => recordCustodyCandidate([], { ...blank, signer_key_id: "secret value with spaces" }, true, true)).toThrow(/opaque/);
    expect(() => recordCustodyCandidate([], { ...blank, signer_decision: "SIGNER_NOT_PROVISIONED",
      signer_key_id: "signer001" }, true, true)).toThrow(/Unprovisioned/);
  });
  it("rejects privilege upgrades and altered original metadata before export", () => {
    const notes = recordCustodyCandidate([], blank, true, true);
    expect(() => createCustodyCandidateReceipt([{ ...notes[0], independently_witnessed: true as false }]))
      .toThrow(/promoted/);
    expect(() => createCustodyCandidateReceipt([{ ...notes[0], custodian_receipt_id: "not valid!" }]))
      .toThrow(/opaque/);
  });
});
