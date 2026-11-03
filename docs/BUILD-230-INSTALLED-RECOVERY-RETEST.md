# Build 230 — Installed Recovery & Device/Camera Retest Closure

## What the owner sees

**System > Windows field acceptance & regression matrix > Retest comparison & owner closure review**, below Builds 228 and 229, supports supervised evidence review for:

- Windows dependency startup, installed release/version and rollback identity.
- Home Assistant inventory, authorized supported camera/fallback and MQTT/X10 boundaries.
- Encrypted backup/isolated restore rehearsal, manual rollback/safe stop and Windows resource budget.

Standard theme, keyboard and role-security issues are not silently closed by Build 230; they remain follow-ups for a separately approved Build 231.

## Evidence-linked workflow

1. First complete the Build 228 actual installed-Windows review. If saved, import its full **private owner field handoff**. No sampled hardware result is ever inferred from source CI.
2. Use Build 229 to classify a real finding or blocker, attach a fresh reproduction reference and create an owner **repair proposal**. If saved, import the full Build 229 private plan **after** matching the Build 228 handoff. The importer checks the exact source cases, version, order, computed safety gates and redacted format, and resets old retests.
3. Only source-matched **owner repair proposals** are eligible for a Build 230 retest closure packet. An investigation, deferred case, missing source or unsanctioned repair remains awaiting scoping.
4. After a **separately authorized and actually witnessed Windows repair/configuration change**, record a safe local change reference and check that the change was witnessed. This page does not perform, approve or install the change.
5. Inspect safe-stop/rollback and the relevant HA, MQTT or camera/provider boundary. Record the observed installed version/configuration, retest outcome, evidence basis and a **new distinct local retest reference**. Attest to physically witnessing the new test, then explicitly record its time.
6. The candidate gate requires complete source/reproduction evidence, a change reference distinct from the Build 228 and Build 229 references, safe-stop/provider review, a distinct fresh retest reference, installed version and a retest recorded at/after the change and after the original finding. Any source/plan change invalidates the packet.
7. Copy the **private Build 230 retest comparison packet** for separate owner and independent review. A pass is only an *owner-reported closure candidate*. Failed or blocked retests remain unresolved. There is no `CLOSED_VERIFIED` state.

## Current truth and safety

- **No authentic Build 228/229 Windows field findings or authorized on-device repairs were available to scope Build 230.** The initial actual repair/retest count is **0**. Synthetic cases exist in automated tests only.
- The screen is local-session-only and never probes a Windows service, controls a camera, publishes MQTT, restarts Home Assistant or changes backup/restore state. It never uploads credentials, images, logs or packet content. Evidence fields accept only short safe local reference codes.
- `main` source CI GREEN means the tested application code was promoted; **it does not mean the Windows mini-server was installed, repaired, independently witnessed or accepted**.
- Six-app integrations remain **DISCONNECTED / HOLD**, private relay **OFF**, QL-275 **UNDER REVIEW / DEFERRED**, and first-party vault **SECURITY HOLD**.
- Owner choice to build this *workflow* does not authorize physical changes, cross-app connections, a new vault, or a future Build 231.

## Source verification

- `npm run build:230:hub:test`: default holds, original-to-plan identity matching, strict private 229 import, fresh retest/version/reference/sequence gates, independent-closure denial, missing or failed retests, and zero calls to `fetch`.
- `npm run web:typecheck`, `npm run web:build`, full 895+ test regressions and five-job GitHub CI on `dev`, PR and exact `main` are separate, required source promotion checks.
