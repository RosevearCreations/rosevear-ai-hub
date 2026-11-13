import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Ql439ReadOnlyInspector, type Ql439ReadinessSnapshot } from "./Ql439ReadOnlyInspector";

afterEach(() => cleanup());

const snapshot: Ql439ReadinessSnapshot = {
  source: "protected-synthetic-fixture",
  observedAt: "2026-11-13T00:00:00Z",
  incidentId: "incident-fixture",
  ceremonyId: "ceremony-fixture",
  episodeId: "episode-fixture",
  custody: "READINESS",
  connection: "HOLD",
  activationAuthorized: false,
  receiverObservation: "SIGNED_OFF_HISTORICAL",
  verifiedReceipts: [{
    id: "receipt-a", label: "QL-438 closure", digest: "a".repeat(64),
    signer: "fixture-signer", observedAt: "2026-11-13T00:00:00Z",
  }],
};

describe("QL-439 read-only owner inspector", () => {
  it("renders source-backed receipts without implying live receiver OFF", () => {
    render(<Ql439ReadOnlyInspector snapshot={snapshot} />);
    expect(screen.getByText("protected-synthetic-fixture")).toBeInTheDocument();
    expect(screen.getByText("Historical signed OFF only; live state unverified")).toBeInTheDocument();
    expect(screen.getByText("HOLD — preparation only, no activation authority")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has explicit empty, pending and error states", () => {
    const { rerender } = render(<Ql439ReadOnlyInspector />);
    expect(screen.getByText("No authorized QL-439 evidence snapshot.")).toBeInTheDocument();
    rerender(<Ql439ReadOnlyInspector pending />);
    expect(screen.getByText("Loading protected evidence…")).toBeInTheDocument();
    rerender(<Ql439ReadOnlyInspector error="Forbidden" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Forbidden");
  });

  it("fails closed if a malformed server response claims CONNECTED", () => {
    const unsafe = { ...snapshot, connection: "CONNECTED", activationAuthorized: true };
    render(<Ql439ReadOnlyInspector snapshot={unsafe as unknown as Ql439ReadinessSnapshot} />);
    expect(screen.getByRole("alert")).toHaveTextContent("remain on HOLD");
    expect(screen.queryByText("protected-synthetic-fixture")).not.toBeInTheDocument();
  });

  it("does not fabricate receipts when source supplies none", () => {
    render(<Ql439ReadOnlyInspector snapshot={{ ...snapshot, verifiedReceipts: [] }} />);
    expect(screen.getByText("No authorized receipts supplied.")).toBeInTheDocument();
  });
});
