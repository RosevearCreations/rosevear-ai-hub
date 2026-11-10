# Rosevear AI Hub 297 — Independent Field Receipt Review Packet, Cross-App Source Mapping & Owner-Supervised Evidence Review Handoff

Build 297 adds a browser-only, private JSON review packet after a source-matched Build 295 custody note and a later Build 296 owner checklist. Its export requires explicit acknowledgement. Invalid, missing, chronologically inconsistent, trust-positive, or forged input fails closed. No uploaded evidence is parsed and no receiver is contacted.

The packet carries a claimed **unsigned** custody digest, all seven outstanding independent original-evidence requirements and a seven-member source map. Every mapping is `NOT_VERIFIED`, transport `DISABLED`, publication `false`. Accepted receipts and messages remain zero, with production authorization `HOLD`.

## Master Shell responsibilities

| Application | Relationship | Intended boundary |
| --- | --- | --- |
| Rosevear AI Hub | Local operational source (spoke) | Windows launcher, service/device health and field evidence candidates |
| AI Data Platform | Master intelligence and monitoring plane | Authorized scoped read models, fleet health, evidence assessment and analytics |
| Rosevear Comms Hub | Complementary master communications plane | Authorized operator incidents, notifications, follow-ups and handoff |
| Devil n Dove | Independent business source | Tenant-safe status and permitted events |
| Rosie Dazzlers | Independent business source | Tenant-safe status and permitted events |
| Yard Workers (`yw`) | Multi-tenant SaaS source | Shell-level platform status, never another tenant's job records |
| iCamp | Multi-tenant SaaS source | Shell-level platform status, never Camp Rosevear's guest data without scoped authority |

AI Hub is **not** a master of the other business applications. It is a source subordinate to the suite's two complementary master planes, while retaining authority over its own local operations. The two master planes have distinct intelligence and communications responsibilities, not uncontrolled authority to change source systems.

## Genuine connection sequence (not performed by this build)

1. On the original Windows host, establish installed release/process identity and independent original issuer evidence.
2. Independently enroll and verify public signer/witness trust anchors, signed owner consent, canonical receipt signatures, replay/expiry controls and source sequence.
3. Register authorized least-privilege source-to-shell contracts and receiver identities; verify tenant/role isolation and auditable denied cases.
4. Run supervised nonproduction health/capability and signed receipt exchanges, independently audit both sides and obtain separate owner approval.
5. Only then enable the approved publisher and read models; monitor freshness, rollback and revocation.

Source CI success validates code only. It cannot verify the original Windows host, signature, witness, consent, receiver or live cross-application connection. No production deployment or field acceptance is implied by this review packet. Keep the exported JSON private; it contains metadata only and is not an identity credential.

**Next proposed Build 298 — Independent Receipt Schema Validation, Source Identity Resolution & Owner Field Review Exception Triage.**

