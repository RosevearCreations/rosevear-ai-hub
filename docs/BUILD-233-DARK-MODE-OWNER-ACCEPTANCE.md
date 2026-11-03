# Build 233 — Windows Dark Mode Owner Acceptance & Verified Closure Exception Follow-Up

**Source scope:** separately owner-authorized UI, workflow and test changes. **No installed Windows repair, independent closure, security grant, device/camera activation or relay integration is authorized by this work.**

## How we use it on Windows

1. Sign in with the owner/administrator role and open **System → Windows field acceptance & regression matrix**.
2. At the sidebar **Display theme**, select **Dark Mode**. The actual selected appearance is passed into the Build 233 panel; Standard or High contrast cannot be marked as a current Dark Mode observation. Display theme is a locally remembered presentation preference, not a security control.
3. On the **actual installed Windows Hub**, record the installed version and confirm the physical witness in Build 228. A GitHub build version, browser preview or simulated test is insufficient.
4. Scroll past Build 232 and select **Open Build 233 owner acceptance & exception review**. The longer worksheet loads only when requested, keeping earlier owner review screens responsive. Review Home/System/Devices surfaces, status and safety labels, forms and dialogs, keyboard/zoom/theme switching, and Windows tablet/narrow layout. For every actually performed check, choose outcome and source, enter the matching installed version and a short local reference (for example `WIN-233-SURFACES`), attest owner observation, and explicitly record a fresh timestamp. Findings and blocked checks remain open; they do not create permission to repair.
5. In **source-matched closure exception follow-up**, a case appears only after a real Build 228 owner finding and related Builds 229–232 entries. Choose **request authentic proof**, **retest**, **defer** or **request outside validation**. The last option is eligible only if Build 232 already contains a qualifying separate closure-review request; it is still *not* independently validated.
6. Record a new and distinct owner follow-up reference and a limited owner authorization checkbox, then record a fresh time. Changing the underlying evidence, reviewer metadata or owner decision invalidates an older follow-up. Copy the private packet to approved local custody if needed; the software makes no upload.

## Claim and privacy boundaries

- No authentic physical-Windows observations or independently authenticated reviewer receipts were provided during implementation. The production screen begins with **zero owner visual passes, zero real closure exceptions and zero verified closures**.
- A full set of owner-reported visual passes does not mean independent Windows acceptance. Reviewer codes are metadata only; neither the code nor owner requests certify field closure.
- No backup/restore, Windows startup or role change, MQTT/X10 command, camera stream, private relay, credential operation or application integration is invoked by this panel.
- Six-app integration is **DISCONNECTED / HOLD**; private relay **OFF**; QL-275 **UNDER REVIEW / DEFERRED**; first-party local vault **SECURITY HOLD**.
- Browser-session worksheet values disappear after reload; the separate Dark Mode display choice is saved locally. Export safe tracking identifiers only, never local paths, credentials, IPs, personally identifying details, full logs, photos or camera content.
- The GitHub `main` CI GREEN gate certifies passing source tests and builds only, not installed Windows rollout or independently verified repair closure.

## Validation

- `npm run build:233:hub:test` covers initial empty/held truth, version/witness and appearance-gated passes, stale source snapshots, duplicate evidence references, owner authorization, external-validation eligibility, no automatic repair/closure, local forms and redacted packet export.
- `npm run web:typecheck`, `npm run web:build`, full web tests and five-job GitHub CI must all succeed on `dev`, PR and exact protected `main` before source promotion is marked GREEN.
- No automatic Build 234 is scheduled. A subsequent fix requires an authentic, source-specific owner finding and a separate repair authorization.
