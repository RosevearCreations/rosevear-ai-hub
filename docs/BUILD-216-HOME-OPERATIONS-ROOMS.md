# Build 216 — Home Operations Rooms, Scenes & Safe Action Approval

The Home Assistant workspace adds a room-oriented review using only authenticated registry observations. Devices are grouped under source-reported room names, with an explicit Unassigned room. It distinguishes recent, stale (>24h), and unknown/future/missing observations. When Home Assistant is unavailable, counts remain unknown rather than fabricated zero.

The owner-only selection is **planning-only**: a maximum of four fresh, explicitly allowed candidates; stale and unknown devices are never eligible. The selection is held only in the open React view and is cleared by the Safe-stop control. No API write, scene command, automation, scheduling, or actual execution occurs in this panel. The existing separately authorized Scene Draft workbench continues to require a fresh server preview, exact confirmation and audited execution and is not bypassed.

Do not select hazardous switches (furnaces, kilns, door locks, alarms or safety equipment), even when an upstream candidate appears allowlisted. Actual Home Assistant state changes, device/network tests, Windows installation and safe-stop checks require independent owner field acceptance. QL-275 remains deferred/Under Review, integration disconnected/HOLD and relay OFF.

Verify with `npm run build:216:hub:test`, the full web suite, `npm run web:build`, and exact GitHub feature/dev/main source CI gates.
