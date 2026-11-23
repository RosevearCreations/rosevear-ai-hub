import {afterEach, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";

import {SecurityCustody382} from "./SecurityCustody382";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("Build382 never revokes sessions until a reauthenticated exact owner choice", async () => {
  const requests: Array<{url: string; method: string; body: string}> = [];
  let remaining = 2;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push({url, method, body: String(init?.body ?? "")});
    if (url.endsWith("/posture")) {
      return {ok: true, json: async () => ({
        schema: "rosevear.hub.security-custody382.v1",
        source: "LOCAL_AUTH_METADATA_ONLY", checkedAtUtc: "2026-11-23T17:00:00Z",
        activeOtherOwnerSessions: remaining, otherAccountsUnaffected: true,
        currentSessionPreservedOnRevocation: true, sessionMaxHours: 168,
        cookieSecureConfigured: true, mfaEnforced: false,
        mfaEnrollmentAvailable: false, vaultCredentialIntakeEnabled: false,
        tlsCertificateActuallyVerified: false, secretKeyRotationActuallyVerified: false,
        offMachineIndependentRestoreVerified: false, retentionAutoPruneEnabled: false,
        backupRetentionTargetDays: 180, auditRetentionTargetDays: 180,
        sbom: "LOCAL_REPRODUCIBLE_SOURCE_MANIFEST_REVIEW_REQUIRED",
        verifiedLocalOperations: [], fieldAcceptance: "HOLD",
        secretValuesRead: false, externalRequests: 0, firewallChanges: 0,
        tlsKeyChanges: 0, backupDeletions: 0,
      })};
    }
    if (url.endsWith("/revoke-other-sessions")) {
      remaining = 0;
      return {ok: true, json: async () => ({
        schema: "rosevear.hub.security-custody382.session-containment.v1",
        revokedCount: 2, currentSessionPreserved: true,
        otherAccountsUnaffected: true, credentialValuesStored: false,
        auditMetadataOnly: true, completedAtUtc: "2026-11-23T17:01:00Z",
      })};
    }
    throw new Error("Unexpected request");
  }));
  render(<SecurityCustody382 />);
  expect(await screen.findByText("2")).toBeInTheDocument();
  expect(requests.every(item => item.method === "GET")).toBe(true);
  const action = screen.getByRole("button", {name: "Revoke my other sessions"});
  expect(action).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/current password to reauthenticate/), {
    target: {value: "test-owner-password-382"},
  });
  fireEvent.change(screen.getByLabelText(/Type.*exactly to authorize revocation/), {
    target: {value: "REVOKE MY OTHER SESSIONS"},
  });
  expect(action).toBeEnabled();
  fireEvent.click(action);
  expect(await screen.findByText(/Revoked 2 other owner session/)).toBeInTheDocument();
  const writes = requests.filter(item => item.method === "POST");
  expect(writes).toHaveLength(1);
  expect(writes[0].url).toContain("/api/v1/system/security-custody-382/revoke-other-sessions");
  expect(JSON.parse(writes[0].body)).toMatchObject({
    password: "test-owner-password-382",
    confirmation: "REVOKE_MY_OTHER_SESSIONS",
  });
  await waitFor(() => expect(screen.getByLabelText(/current password to reauthenticate/))
    .toHaveValue(""));
  expect(requests.every(item => !/firewall|install|delete-backup|tls-rotate/.test(item.url)))
    .toBe(true);
});
