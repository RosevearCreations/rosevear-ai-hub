/** Build 128: explanatory boundary only. This module contains no file or crypto APIs. */
export const VAULT_DOCUMENT_PREPARATION_SCHEMA = "rosevear-vault-document-preparation/v1" as const;

export const vaultDocumentReviewStages = [
  { id: "admission", title: "Constrained document intake", requirement: "Reject real input now. Future intake must enforce reviewed content types, bounded sizes and file counts, extension/content/signature checks and appropriate malware/CDR handling; signatures alone do not make documents safe." },
  { id: "identity", title: "Opaque private document identity", requirement: "Keep owner, document, revision, envelope and chunk indexes authenticated. No original filenames, filesystem paths, private titles or plaintext go in transport metadata or audit logs." },
  { id: "chunks", title: "Authenticated, bounded encrypted chunks", requirement: "Synthetic tests exercise unique AES-GCM IVs, fresh envelope identifiers, associated data binding and fail-closed complete ordering. Real document encryption and chunk storage are not approved." },
  { id: "preview", title: "No active document preview", requirement: "Future downloads must not inline-render active PDFs, HTML or SVG in the Hub origin. File scanning, content-disposition, sandboxing and content-type enforcement need independent review." },
  { id: "recovery", title: "Version, deletion and disaster policy", requirement: "A real server needs independently verified version monotonicity, owner-scoped access, revocation, backups and restore; AES-GCM alone cannot prevent valid old ciphertext replay." },
  { id: "windows", title: "Separate Windows field acceptance", requirement: "Review browser memory and clipboard, disk temp files, AV handling, Windows ACLs, logs, upload retries, offline restore and reboot with disposable accounts before any real document." },
] as const;

export const vaultDocumentDenialCases = [
  { id: "real_file", title: "Real household file", expected: "No file picker, drag-and-drop, upload or persistence is permitted from this Hub review screen." },
  { id: "tamper", title: "Modified synthetic chunk", expected: "A flipped byte, wrong IV, changed context or corrupted authentication tag must not decrypt." },
  { id: "incomplete", title: "Reordered, omitted or extra chunk", expected: "Reject a missing, duplicated, re-ordered or appended chunk and mismatched declared length." },
  { id: "mixing", title: "Spliced unrelated document envelope", expected: "An encrypted chunk from another synthetic envelope or owner cannot authenticate in this envelope." },
  { id: "replay", title: "Complete older envelope", expected: "An intact old envelope still decrypts; a future independent anti-rollback ledger must reject it." },
] as const;

/** Intentionally ignores claims of owner approval or external review. No activation path. */
export function assessVaultDocumentPreparation(_untrustedEvidence?: Record<string, boolean>) {
  return {
    schema: VAULT_DOCUMENT_PREPARATION_SCHEMA,
    phase: "SYNTHETIC_DOCUMENT_TESTS_ONLY" as const,
    accepted_fixture_kind: "DISPOSABLE_BYTES_ONLY" as const,
    test_primitive: "WEB_CRYPTO_AES_256_GCM" as const,
    shipped_document_crypto: false as const,
    document_picker: "DISABLED" as const,
    document_upload: "DISABLED" as const,
    private_preview: "DISABLED" as const,
    document_storage: "DISABLED" as const,
    document_download: "DISABLED" as const,
    service_installed: false as const,
    windows_field_acceptance: "HOLD" as const,
    production_security_acceptance: "HOLD" as const,
  };
}
