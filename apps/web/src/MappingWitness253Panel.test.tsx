import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MappingWitness253Panel } from "./MappingWitness253Panel";

describe("Build 253 owner-facing signed witness review", () => {
  it("starts fail-closed with no signed receipt, signer enrollment or host action", () => {
    const {container} = render(<MappingWitness253Panel expectedSha={"a".repeat(40)}
      signedReceiptArtifactSha256={null} signedReceiptSignerKey={null}
      signedReceiptObservedAt={null} signedReceiptVerified={false} signerPin="" />);
    expect(screen.getByRole("region", {name: /Build 253 signed artifact-kind/i})).toBeDefined();
    expect((screen.getByRole("button", {name: "Verify artifact-kind signature locally"}) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", {name: "Verify independent witness signature locally"}) as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain("SUPERVISED PROCESS ATTESTATION HOLD");
    expect(container.textContent).toContain("cannot enroll a signer");
    expect(container.querySelectorAll('button[type="submit"]').length).toBe(0);
  });
});
