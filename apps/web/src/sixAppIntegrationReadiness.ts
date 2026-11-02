/** Build 227: public contract planning, not a network probe or activation authority. */
export const SIX_APP_CONTRACT_SCHEMA = "rosevear-hub-six-app-readiness/v1" as const;

export const sixAppContracts = [
  { id: "ai_data_platform", name: "AI Data Platform", purpose: "Read-only capability and provenance consumer; never ingest household credentials.", proposedCapability: "Nonproduction health and capability metadata", scope: "Platform-specific test identity and workspace boundary" },
  { id: "devil_n_dove", name: "Devil n Dove", purpose: "Commerce operations proof only; no product publishing, Etsy changes or private customer data.", proposedCapability: "Nonproduction integration capability metadata", scope: "Devil n Dove test tenant only" },
  { id: "rosie_dazzlers", name: "Rosie Dazzlers", purpose: "Detailing availability proof only; no live booking, payments or notifications.", proposedCapability: "Nonproduction integration capability metadata", scope: "Rosie Dazzlers test tenant only" },
  { id: "yard_workers", name: "Yard Workers", purpose: "Operations contract proof only; no dispatch, invoices or live work orders.", proposedCapability: "Nonproduction integration capability metadata", scope: "Yard Workers test company only" },
  { id: "icamp", name: "iCamp", purpose: "Campground contract proof only; no guest records, occupancy writes or billing.", proposedCapability: "Nonproduction integration capability metadata", scope: "iCamp test campground only" },
  { id: "comms_hub", name: "Rosevear Comms Hub", purpose: "Operator routing proof only; no phone calls, SMS, assignments or message delivery.", proposedCapability: "Nonproduction operator capability metadata", scope: "Four-business operator preview without dispatch rights" },
] as const;

export type SixAppId = typeof sixAppContracts[number]["id"];

export const integrationEvidenceGates = [
  { id: "capability", title: "Capability contract", need: "Versioned schema with an explicit read-only, TEST-only route allowlist and negative write/dispatch denials." },
  { id: "source", title: "Immutable source provenance", need: "Original source A SHA, signed QL-246 Proof-B publication B, ancestry and exact-source CI independently reconciled; no source SHA inferred here." },
  { id: "witness", title: "Independent witness", need: "Original external reviewer receipt, trusted signer pin, challenge custody and witnessed negative tests; copied claims or mock receipts do not qualify." },
  { id: "identity", title: "Scoped identity", need: "Per-app nonproduction credential scope, tenant isolation, least privilege and revocation independently checked; no tokens collected by this screen." },
  { id: "gateway", title: "Gateway TEST boundaries", need: "Private GET-only gateway limits, owner-controlled timebox, explicit reversible plan and verified denial of household devices and cameras." },
  { id: "owner", title: "Separate owner authorization", need: "Explicit owner TEST-only approval for one scoped application and verified independent evidence, separate from source CI." },
] as const;

export const originalIntegrationGaps = [
  "Original signed QL-246 Proof-B and independent signer/pin/challenge custody are not verified for this app.",
  "The app's immutable source-to-proof ancestry and exact-source deployment evidence need independent reconciliation.",
  "No original independent reviewer witness and denied-path results are attached or authenticated here.",
  "Scoped per-app test credentials, tenant separation, expiry and revocation are not verified.",
  "No narrowly bounded private gateway GET plan has been independently accepted on the installed Windows Hub.",
  "No separate owner TEST-only authorization is present; QL-275 remains Deferred / Under Review.",
] as const;

/** Claims from any browser, app or fixture cannot upgrade readiness or grant permission. */
export function assessSixAppReadiness(_claims?: Record<string, unknown>) {
  return {
    schema: SIX_APP_CONTRACT_SCHEMA,
    source: "static_local_contract_requirements" as const,
    apps: sixAppContracts.map(app => ({
      ...app,
      gates: integrationEvidenceGates.map(gate => ({ id: gate.id, state: "NOT_INDEPENDENTLY_VERIFIED" as const })),
      overall: "DISCONNECTED / HOLD" as const,
      missingEvidence: originalIntegrationGaps,
      authenticated_gateway_gets: 0 as const,
      owner_test_authorized: false as const,
    })),
    independently_ready_apps: 0 as const,
    required_apps: sixAppContracts.length,
    signed_proof_b_verified: false as const,
    independent_witness_accepted: false as const,
    private_relay_installed: false as const,
    gateway_test_authorized: false as const,
    authenticated_gateway_gets: 0 as const,
    remote_connection: "DISCONNECTED / HOLD" as const,
    ql275: "UNDER_REVIEW_DEFERRED" as const,
  };
}
