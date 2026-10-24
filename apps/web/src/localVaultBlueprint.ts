/** Build 124: owner-selected first-party local vault design. This is NOT a vault runtime. */
export const LOCAL_VAULT_BLUEPRINT_SCHEMA = "rosevear-local-vault-blueprint/v1" as const;

export const localVaultRecordKinds = [
  { id: "password", title: "Logins and passwords", scope: "Personal by default; deliberately shared credentials need an explicit recipient grant and a separate unlock. Passkey private keys are not in scope." },
  { id: "secure_note", title: "Private notes", scope: "Recovery instructions and sensitive household notes stay encrypted and unavailable to Hub Knowledge and AI." },
  { id: "document", title: "Private documents", scope: "PDFs, scans and ownership records need authenticated encrypted attachments, metadata protection, size limits and safe preview isolation." },
] as const;

export const localVaultSecurityGates = [
  { id: "review", title: "Independent security review", detail: "Threat-model the first-party application and seek an independent code and architecture review before real household data is admitted." },
  { id: "cryptography", title: "Reviewed encryption primitives", detail: "Use platform-vetted authenticated encryption and strong memory-hard key derivation through maintained, reviewed libraries. Never invent a cipher, serialization format or nonce scheme." },
  { id: "identity", title: "Separate household keys and MFA", detail: "Each member has an independent vault key and login; shared collections use explicit grants. WebAuthn/passkeys and separate recovery must resist Hub-admin bypass." },
  { id: "documents", title: "Encrypted document boundaries", detail: "Encrypt document bytes and sensitive metadata before server storage; authenticate chunks and prevent preview, indexing, thumbnails, MIME sniffing and AI access from leaking plaintext." },
  { id: "isolation", title: "Dedicated Windows service and volume", detail: "Separate the vault runtime, service account, encrypted store, backup key and audit channel from Hub, Knowledge, Ollama, connectors and cameras." },
  { id: "network", title: "Private origin only", detail: "Use a separate trusted HTTPS origin through tightly scoped LAN/Tailscale access, no public forwarding and no shared Hub cookies or vault proxy routes." },
  { id: "recovery", title: "Offline encrypted recovery", detail: "Keep independent encrypted backups and separately held keys offline. Rehearse wrong-key rejection and an isolated restore including documents." },
  { id: "windows", title: "Owner-supervised Windows field acceptance", detail: "Prove client lock/revocation, MFA denial, lost-device response, leak checks, reboot survival and private firewall reachability using disposable test items." },
] as const;

export const localVaultThreats = [
  { threat: "A compromised home PC can still be attacked", mitigation: "Keep vault keys off the backend, protect unlocked clients, patch Windows and reject all unattended/plaintext backups." },
  { threat: "A malicious or malformed document can exploit preview", mitigation: "Never render untrusted documents in the Hub. Isolate the future vault preview, validate file types and disable search indexing." },
  { threat: "Custom code can contain security bugs", mitigation: "Do not design home-grown crypto. Require independent review, dependency scanning, disposable-data abuse tests and a cautious rollout." },
  { threat: "Lost keys or ransomware could destroy a vault", mitigation: "Test encrypted offline recovery with a separately kept key and a complete document manifest." },
] as const;

export type LocalVaultGateId = (typeof localVaultSecurityGates)[number]["id"];
export type LocalVaultGateReview = Readonly<Partial<Record<LocalVaultGateId, "reviewed" | "pending" | "failed">>>;

/** The owner's build-direction choice is not approval to install or store real data. */
export function assessLocalVaultBlueprint(review: LocalVaultGateReview = {}) {
  return {
    schema: LOCAL_VAULT_BLUEPRINT_SCHEMA,
    implementation_strategy: "FIRST_PARTY_LOCAL" as const,
    vendor_hosting_required: false as const,
    owner_direction_selected: true as const,
    security_design_approved: false as const,
    independent_review_passed: false as const,
    vault_service_installed: false as const,
    credential_intake: "DISABLED" as const,
    document_upload: "DISABLED" as const,
    encrypted_data_store_available: false as const,
    vault_api_available: false as const,
    mfa_enforced: false as const,
    key_material_accessible_to_hub: false as const,
    vault_access: "DENY" as const,
    production_security_acceptance: "HOLD" as const,
    review_progress: {
      reviewed: localVaultSecurityGates.filter(g => review[g.id] === "reviewed").length,
      failed: localVaultSecurityGates.filter(g => review[g.id] === "failed").length,
      required: localVaultSecurityGates.length,
    },
  };
}
