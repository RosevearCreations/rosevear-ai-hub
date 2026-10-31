# Build 205 — Follow-up routing, checkpoint change awareness and accessible review

- Each compared diagnostic classification links to its specific manual service checks. The existing status filter is reset before jumping so targets are visible. Changes are not repairs or independent verification.
- A live accessible checkpoint indicator distinguishes an untouched recovered/saved checklist from unsaved fixed-choice edits, an available but unrestored checkpoint, and no saved checkpoint.
- High-contrast and keyboard owner review retain explicit next-step anchors and separate browser-session observations from real Windows installation acceptance.

No additional endpoint calls, automatic repairs, device controls, private evidence retention, or integration permissions are introduced. QL-275 remains **Under Review / deferred**; integration remains **DISCONNECTED/HOLD**, relay **OFF**, authenticated gateway GETs **0**.

Verification: `npm run build:205:hub:test`, `npm run web:build`, complete web tests and required GitHub CI on dev/main.

Next planned: **Build 206 — Diagnostics Follow-Up Saved Review Clarity, Owner Accessibility Retest Summary & Source Comparison Resilience (QL-275 Deferred).**
