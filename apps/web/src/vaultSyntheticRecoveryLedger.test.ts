// @vitest-environment node
/**
 * Build 129: IN-MEMORY HYPOTHETICAL witness simulation, not a security control.
 * This file is never imported into the shipped Hub. No disk, clock, credentials,
 * database, network, encrypted files or independently trusted checkpoint exists.
 * A modified / co-rolled-back witness can trivially defeat this model.
 */
import { describe, expect, it } from "vitest";

type Identity = Readonly<{ owner: string; document: string }>;
type Snapshot = Identity & Readonly<{ revision: number; envelope: string; complete: boolean }>;
type Receipt = Readonly<{ revision: number; envelope: string }>;
type HypotheticalWitness = Map<string, Receipt>;
const identity: Identity = { owner: "invented-household-a", document: "invented-document-a" };

function keyOf(value: Identity): string {
  return JSON.stringify([value.owner, value.document]);
}

function seedWitness(subject: Identity, revision: number, envelope: string): HypotheticalWitness {
  return new Map([[keyOf(subject), { revision, envelope }]]);
}

type RestoreDecision =
  | "HOLD_NO_INDEPENDENT_WITNESS"
  | "DENY_INCOMPLETE"
  | "DENY_STALE"
  | "DENY_UNWITNESSED_FUTURE"
  | "DENY_CONFLICTING_ENVELOPE"
  | "SIMULATED_MATCH_ONLY";

function inspectRestore(snapshot: Snapshot, witness?: HypotheticalWitness): RestoreDecision {
  // The "witness" is only an in-memory stand-in; it has NO independent trust.
  if (!witness) return "HOLD_NO_INDEPENDENT_WITNESS";
  const accepted = witness.get(keyOf(snapshot));
  if (!accepted) return "HOLD_NO_INDEPENDENT_WITNESS";
  if (!snapshot.complete) return "DENY_INCOMPLETE";
  if (snapshot.revision < accepted.revision) return "DENY_STALE";
  if (snapshot.revision > accepted.revision) return "DENY_UNWITNESSED_FUTURE";
  if (snapshot.envelope !== accepted.envelope) return "DENY_CONFLICTING_ENVELOPE";
  return "SIMULATED_MATCH_ONLY";
}

type CommitDecision = "SIMULATED_ADVANCE_ONLY" | "HOLD_NO_INDEPENDENT_WITNESS" | "DENY_STALE_PREDECESSOR" | "DENY_NONMONOTONIC" | "DENY_ENVELOPE_REUSE";

/** Mimics compare-and-swap sequential semantics, not crash-safe persistence. */
function proposeNext(
  witness: HypotheticalWitness | undefined, subject: Identity,
  expectedPrevious: Receipt, proposed: Receipt,
): CommitDecision {
  if (!witness) return "HOLD_NO_INDEPENDENT_WITNESS";
  const current = witness.get(keyOf(subject));
  if (!current) return "HOLD_NO_INDEPENDENT_WITNESS";
  if (expectedPrevious.revision !== current.revision || expectedPrevious.envelope !== current.envelope) return "DENY_STALE_PREDECESSOR";
  if (!Number.isSafeInteger(proposed.revision) || proposed.revision !== current.revision + 1) return "DENY_NONMONOTONIC";
  if (!proposed.envelope || proposed.envelope === current.envelope) return "DENY_ENVELOPE_REUSE";
  witness.set(keyOf(subject), { ...proposed });
  return "SIMULATED_ADVANCE_ONLY";
}

describe("Build 129 hypothetical document version witness and recovery tests", () => {
  it("compares an exact synthetic snapshot against a simulated checkpoint", () => {
    const witness = seedWitness(identity, 7, "fake-envelope-7");
    expect(inspectRestore({ ...identity, revision: 7, envelope: "fake-envelope-7", complete: true }, witness)).toBe("SIMULATED_MATCH_ONLY");
  });

  it("denies a complete but older still-authenticated encrypted document revision", () => {
    const witness = seedWitness(identity, 9, "fake-envelope-9");
    expect(inspectRestore({ ...identity, revision: 8, envelope: "fake-envelope-8", complete: true }, witness)).toBe("DENY_STALE");
  });

  it("denies a forked envelope at the same revision or an unwitnessed future revision", () => {
    const witness = seedWitness(identity, 9, "fake-envelope-9");
    expect(inspectRestore({ ...identity, revision: 9, envelope: "forged-envelope-9", complete: true }, witness)).toBe("DENY_CONFLICTING_ENVELOPE");
    expect(inspectRestore({ ...identity, revision: 10, envelope: "future-envelope-10", complete: true }, witness)).toBe("DENY_UNWITNESSED_FUTURE");
  });

  it("denies incomplete snapshot, missing independent checkpoint and other household keys", () => {
    const witness = seedWitness(identity, 3, "fake-envelope-3");
    const snapshot = { ...identity, revision: 3, envelope: "fake-envelope-3", complete: true };
    expect(inspectRestore({ ...snapshot, complete: false }, witness)).toBe("DENY_INCOMPLETE");
    expect(inspectRestore(snapshot)).toBe("HOLD_NO_INDEPENDENT_WITNESS");
    expect(inspectRestore({ ...snapshot, owner: "another-person" }, witness)).toBe("HOLD_NO_INDEPENDENT_WITNESS");
    expect(inspectRestore({ ...snapshot, document: "another-document" }, witness)).toBe("HOLD_NO_INDEPENDENT_WITNESS");
  });

  it("accepts only a successive synthetic version with an exact witnessed predecessor", () => {
    const witness = seedWitness(identity, 3, "fake-envelope-3");
    expect(proposeNext(witness, identity, { revision: 3, envelope: "fake-envelope-3" }, { revision: 4, envelope: "fake-envelope-4" })).toBe("SIMULATED_ADVANCE_ONLY");
    expect(inspectRestore({ ...identity, revision: 3, envelope: "fake-envelope-3", complete: true }, witness)).toBe("DENY_STALE");
    expect(inspectRestore({ ...identity, revision: 4, envelope: "fake-envelope-4", complete: true }, witness)).toBe("SIMULATED_MATCH_ONLY");
  });

  it("rejects a concurrent stale writer's compare-and-swap after another advance", () => {
    const witness = seedWitness(identity, 5, "fake-envelope-5");
    const commonPredecessor = { revision: 5, envelope: "fake-envelope-5" };
    expect(proposeNext(witness, identity, commonPredecessor, { revision: 6, envelope: "writer-a" })).toBe("SIMULATED_ADVANCE_ONLY");
    expect(proposeNext(witness, identity, commonPredecessor, { revision: 6, envelope: "writer-b" })).toBe("DENY_STALE_PREDECESSOR");
    expect(inspectRestore({ ...identity, revision: 6, envelope: "writer-b", complete: true }, witness)).toBe("DENY_CONFLICTING_ENVELOPE");
  });

  it("rejects skipped/decreasing revisions, reused envelope IDs and unwitnessed writes", () => {
    const witness = seedWitness(identity, 4, "fake-envelope-4");
    const previous = { revision: 4, envelope: "fake-envelope-4" };
    for (const revision of [3, 4, 6, 100, Number.MAX_SAFE_INTEGER + 1]) {
      expect(proposeNext(witness, identity, previous, { revision, envelope: "future" })).toBe("DENY_NONMONOTONIC");
    }
    expect(proposeNext(witness, identity, previous, { revision: 5, envelope: "fake-envelope-4" })).toBe("DENY_ENVELOPE_REUSE");
    expect(proposeNext(undefined, identity, previous, { revision: 5, envelope: "fake-envelope-5" })).toBe("HOLD_NO_INDEPENDENT_WITNESS");
  });

  it("models a crash before checkpoint advancement as unwitnessed, and after advancement as missing data", () => {
    const witness = seedWitness(identity, 8, "fake-envelope-8");
    const uncommitted = { ...identity, revision: 9, envelope: "fake-envelope-9", complete: true };
    expect(inspectRestore(uncommitted, witness)).toBe("DENY_UNWITNESSED_FUTURE");
    expect(proposeNext(witness, identity, { revision: 8, envelope: "fake-envelope-8" }, { revision: 9, envelope: "fake-envelope-9" })).toBe("SIMULATED_ADVANCE_ONLY");
    expect(inspectRestore({ ...uncommitted, complete: false }, witness)).toBe("DENY_INCOMPLETE");
    // Neither the Map nor a sequential test function proves atomicity of two real stores.
  });

  it("EXPOSES the co-rollback weakness: a rolled-back witness falsely accepts old content", () => {
    const currentWitness = seedWitness(identity, 12, "fake-envelope-12");
    const staleSnapshot = { ...identity, revision: 10, envelope: "fake-envelope-10", complete: true };
    expect(inspectRestore(staleSnapshot, currentWitness)).toBe("DENY_STALE");
    const stolenAndRolledBackWitness = seedWitness(identity, 10, "fake-envelope-10");
    expect(inspectRestore(staleSnapshot, stolenAndRolledBackWitness)).toBe("SIMULATED_MATCH_ONLY");
    // A real independent trusted anchor, unavailable in this build, is essential.
  });
});
