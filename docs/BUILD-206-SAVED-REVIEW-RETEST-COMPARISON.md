# Build 206 — Saved owner review, accessible retest summary and comparison resilience

The owner can see a safe, fixed-choice summary of the saved review before choosing Recover, including how many application screens and device observations were recorded. Unsaved changes remain clearly distinguished; nothing is automatically restored or sent to the backend.

The Windows review offers an accessible linked summary of reported retest dispositions for each failed check, with explicit independent-witness and physical-acceptance disclaimers. The diagnostic comparison displays a count of completed on-demand samples and lets the owner clear comparison history without losing the latest status reading. A later manual refresh creates a fresh two-sample comparison. Aborted requests do not count as completed checks.

**Boundaries:** QL-275 stays Under Review / deferred. Integration DISCONNECTED/HOLD, private relay OFF, authenticated gateway GETs 0. No device actions, automatic repairs, credential capture, durable diagnostic history or on-device acceptance claimed.

Validate with `npm run build:206:hub:test`, `npm run web:build`, full web tests and five GitHub Actions jobs through feature, dev, and exact main push.

Next planned: **Build 207 — Diagnostic Source Comparison Owner Follow-Up, Windows Retest Review Filters & Standard Theme Keyboard Recovery Assurance (QL-275 Deferred).**
