# Build 115 — Operator-Reviewed Camera Discovery & Bulk Restore Candidates

## Owner workflow on the installed Windows Hub

1. Log in as **Owner/Administrator**, open **Cameras → Camera discovery & bulk restore candidates**. Read-only users do not see the recovery workbench.
2. Import a privately exported **Build 107 Device/Camera Inventory** or **Build 110 Follow-up Worklist**. Only camera IDs, names and source timestamps survive parsing. Never upload logs, RTSP URLs, tokens or passwords. The evidence is held in the browser session, not automatically uploaded or stored.
3. Select **Compare fresh registry and ONVIF discovery**. This deliberately calls the existing authenticated camera-registry GET and bounded 2.5-second private ONVIF discovery preview. It does not add or enable any devices. Results must be newer than the evidence and the one-use preview expires within 300 seconds.
4. Inspect every row and the actual hardware/model label. A prior exact endpoint UUID **and** equal normalized name, with no network or name conflict, is only a **restore candidate**. Bounded ONVIF hardware hints are untrusted and are for manual comparison, not proof. Already registered, moved IDs, changed names, duplicate network endpoints, ambiguous same-name models and absent prior identities are held for individual investigation.
5. Select the appropriate candidates one by one or use **Select all exact-ID candidates**. Explicitly mark **I reviewed physical hardware/models...**. The confirmation resets whenever selection changes. Before any write the client re-reads the registry to detect new conflicts. The backend independently consumes the owner-bound one-use discovery ticket and rejects shared endpoints/duplicate identities before any registration.
6. Select **Register owner-approved camera(s) disabled** only after owner approval. Newly created entries are disabled and have **no RTSP stream**; no existing camera/stream is overwritten, switched, enabled or deleted. Conflicts or concurrent changes require rescanning.
7. Download the **private disabled-registration receipt** immediately after a complete validated response. It lists selected endpoint IDs, new registry IDs, source/review timestamps and unconditional playback/stream HOLD. Retain it privately to guide *manual*, reversible follow-up by registry ID. No auto-reversal is attempted.

## Boundaries and limitations

- This build recovers **registry candidate review**, not lost vendor-cloud credentials, undiscoverable cameras, OEM pairing, router segments, RTSP playback or Home Assistant integration membership. Non-ONVIF cameras can remain missing and do not justify automatic proxy actions.
- An ONVIF WS-Discovery response is untrusted device-provided metadata; hardware label and display name may change or be duplicated. The exact endpoint UUID may itself be spoofed: a successful match **still requires operator physical verification**. Security-critical decisions never use model hints alone.
- Existing Build 070 simple registration remains available for separately investigated new cameras; its existing disabled-only selected approval now benefits from the same backend endpoint-collision guard.
- The receipt is not a deployment, field acceptance or verified backup; its identities must not be blindly replayed as new authorization. The server's audit event records actual successful registration counts independently.
- Local Windows production, actual private go2rtc listener safety, moving video, restart survival and owner acceptance remain **HOLD** until separately observed. `main` GitHub CI GREEN only proves source/build/test gates.

## Knowledge Base vs password vault (new requirements)

- The existing Knowledge interface supports manual private collections and uploads of **PDF, DOCX, TXT and MD** with indexing, optional local Ollama retrieval and source citations. Recipes, vehicle oil-change notes and manuals belong here. Scanned image-only PDFs may require separate OCR before searchable text is available; upload/indexing is not the same as a verified answer.
- The existing encrypted **Secrets** module is for server integration tokens; it never displays stored values again. It is **not** the requested household password keeper. Do not put login credentials in Knowledge documents, conversations, AI prompts or camera receipts.
- New separate requested vault roadmap: **Build 119** threat model/choose reviewed technology; **Build 120** per-person encrypted local client-accessible vault and secure lock; **Build 121** phishing-resistant MFA and recovery; **Build 122** security verification and Windows field acceptance. Vault development must have security review before accepting real credentials.
- Authoritative security references: OWASP Password Storage Cheat Sheet (Argon2id for authentication secrets) <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>; NIST SP 800-63B (phishing-resistant WebAuthn) <https://pages.nist.gov/800-63-4/sp800-63b.html>.

## Verification

- Pure browser logic: bounded parser, identity and model ambiguity, duplicate addresses, saved/changed IDs, sensitive-field rejection, stale evidence and receipt hard hold.
- React: no automatic discovery, explicit selection and physical confirmation, failed scan unknown, preflight race rejection, one-time receipt export.
- Backend: unauthorized roles retained, no-preview write, one-use tickets, all-or-nothing duplicate endpoint rejection, bounded hardware hints and disabled-only camera creation.
- All web tests/typecheck, production Vite bundle, applicable Python tests, independent feature PR, `dev` push and protected `main` workflows plus Windows desktop artifact.
