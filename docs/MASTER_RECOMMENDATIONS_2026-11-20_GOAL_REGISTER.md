# Three Masters — owner recommendation goal register (reviewed Nov 20, 2026)

**Basis:** The owner-uploaded `Rosevear_Three_Master_Application_Review(3).pdf`
(11 pages, November 20, 2026). This register expresses **proposed goals**,
not actual deployed capabilities, approval to access accounts, or completion.
Source claims must be compared with current exact protected branch and real
runtime evidence before creating a release. Each business keeps its own
customer records, permissions, transactions, books and tax controls.

## Master-specific roles

1. **AI Data Platform**: seven-source fleet availability, signed challenge-
   correlated receipts, source revision, metrics dictionary (numerator,
   denominator, time window, eligible sources, tenant audience) and evidence
   drilldown. Avoid borrowing receipts between overlapping sweeps.
2. **Rosevear Comms Hub**: one operator incident per source/environment/
   episode, assignment, private brand-safe communication, durable restart,
   explicit receipt versus actual provider delivery, consent-gated outreach.
3. **Rosevear AI Hub**: original Windows host, a separately enrolled printer
   PC, local device inventory, dated observations, signed local receipts,
   owner-approved camera viewing and privacy-safe device identity.
   Physical device reporting stays source-scoped.

## Build 371 review of what already works and what is still a proposal

| Goal | Existing verified source | Build 371 implementation | Remaining field gate |
| --- | --- | --- | --- |
| Printer-PC data source | Build 370 signed HTTPS collector and owner report | Windows USB PnP hashed IDs + 2-receipt comparison | Install on original printer PC; independent key/CA custody; first real receipts |
| Two local USB cameras | No camera preview from Build 370 collector | Optional localhost-only one-at-a-time snapshots | Witness 2 actual images; independent future consent for remote feed |
| Ender 5 Pro activity | Build 370 optional local OctoPrint GET if present | No COM opening or fabricated G-code status | Identify controller owner; later real printer status with agreed source |
| USB identity mapping | COM enumeration in Build 370 | Hashed Windows PnP identity, port drift and missing/stale states | Owner associates stable IDs and proves reconnect handling |
| Offline queue | One-shot unsigned transport delivery and durable Hub receipt storage | Not implemented | Bounded disk queue, queue age/drop count, reconnect tests |
| Master signed ACK | Other Master route foundations exist | No unapproved receiver activation | Independently pinned original-host and remote-peer ACK |
| Cross-master case journey | Report proposes first YW and iCamp pilots | Not implemented by Hub Build 371 | Staged outage -> one case -> owner closure in Comms, measured AIDP view |

## Recommendation-driven priority and explicit acceptance

The report's six-step delivery order is an inter-repository goal sequence,
**not a new 371–387 implementation claim**. Pilot AIDP signed Yard Workers
and iCamp receipts and sweep challenge; Comms single incident-to-closure;
Hub first original-host/printer-PC receipt and observed staleness; then the
remaining Cloudflare apps; business-owned outcomes; finally restore/load,
simulation and AI evaluations. Do not report targets (fleet coverage,
p95 convergence, RTO, RPO) as live performance without measured baselines.

For each future build: first inspect exact code and currently deployed
revision, define an incremental acceptance test with real receipt or
synthetic label, identify missing credentials or physical actions, and
calculate source and field completion separately. No automatic +5–10%
global score from queue position.

## Queue reconciliation

The original versioned roadmap listed MQTT/Zigbee/Z-Wave/Thread/Bluetooth as
Build 371. The owner explicitly reprioritized **Build 371 to printer-PC
enrollment**, leaving that radio protocol capability **not implemented**.
Keep it as an explicit pending goal to schedule without silently marking it
done. Build 372 remains the next numbered Alexa/consent queue entry,
with Builds 372–387 (16 numbered releases) still planned. This count
does not include the displaced radio goal until it is assigned a build number.

References: `docs/BUILD_QUEUE_368_387_HOME_NETWORK_MASTERS.md`,
`docs/BUILD_370_PRINTER_PC_READ_ONLY_GATEWAY.md`,
`docs/BUILD_371_SUPERVISED_PRINTER_PC_CAMERA_SETUP.md` and the uploaded
Master review (architecture pp.1–2, Hub p.5, packaging p.6,
simulation p.8, metrics p.9, delivery order p.10).
