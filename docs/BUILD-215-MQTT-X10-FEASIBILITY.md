# Build 215 — MQTT and X10 Legacy Device Bridging Feasibility

The existing owner-bounded MQTT topic explorer is extended with a read-only feasibility workbench. It lists the owner inventory categories (PowerHouse modules, motion sensors, pan/tilt mounts), required compatible X10 interface/receiver and model checks, and a preview-only X10-motion → authorized bridge → allowlisted MQTT → Home Assistant review → potential Meross rule. No hardware compatibility is inferred from a green broker or a buffered topic. Unknown is explicitly unknown when the broker or topic evidence is unavailable.

An Owner/Administrator may check local prerequisites for discussion, but these selections and the non-secret notes are **in memory only**, not an authorization receipt, hardware attestation or persisted inventory. Resetting returns all prerequisites to unverified. Read-only roles see the guidance but cannot edit checkboxes. Existing MQTT publish actions are unchanged and are never invoked by this feasibility workbench.

## Owner hardware acceptance (outside CI)

1. Record exact X10 model numbers, powerline/RF controller, transceiver and signal path; verify electrical compatibility and manufacturer documentation.
2. Independently verify Windows USB/serial support, broker identity, allowlisted read-only topic, HA device mapping and private network isolation. Do not enter credentials or device codes in public notes.
3. Define explicit safe-stop and permissions before any manual or automated trigger; require new owner authorization before MQTT publication, HA automation, Meross switching or pan/tilt movement.
4. Record test evidence from the real Windows machine and mark unsupported or unverified paths accurately.

QL-275 remains deferred/Under Review; integration disconnected/HOLD, relay OFF, and no implied gateway TEST permission. Source CI is not physical X10 or Meross acceptance.
