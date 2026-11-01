# Build 212 — Home Assistant device inventory reconciliation and missing-device workbench

The existing Device 360 workspace now has a source-labeled Home Assistant → Hub reconciliation summary. It distinguishes actual **HA device and entity IDs** from **Hub owner annotations** (which are only labels on provider IDs, not separate pieces of hardware).

When the authenticated HA registry is available, the workbench identifies previously reviewed exact IDs absent from that reading, unknown classifications, HA observations older than 24 hours and cross-source same-name candidates requiring review. These are bounded, advisory presentations. Missing IDs do not imply physical deletion; a same-name match never triggers an automatic merge. The historical private inventory comparison and owner-safe registry annotation tools remain available through existing linked panels.

When HA is not available, current device/entity counts and missing IDs are **unknown**, not zero. No new provider writes, discovery, repairs, action triggers, network probes or automatic pairing are introduced. Successful CI never verifies physical device connectivity or an installed Windows release.

Validation: `npm run build:212:hub:test`, full web suite, `npm run web:build`, then GitHub feature/independent-dev/exact-main five-job CI.

QL-275 remains **Under Review / deferred**, while integration security is **DISCONNECTED/HOLD**, relay OFF, authenticated gateway GETs 0, owner TEST not given. Independent password/document vault security remains HOLD.

**Next Build 213 — Camera Inventory Compatibility & Connection Diagnostics (QL-275 Deferred).**
