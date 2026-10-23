# Build 112 — Supervised Field Recheck Drift & Evidence Chain Handoff

Build 112 extends the private, owner-supervised Home Assistant and camera recovery sequence without changing our real devices. It adds a **historical evidence-chain and field handoff** section in the Devices inventory recovery workbench after Build 111.

## What the workbench does

1. Import the matching, owner-exported **Build 110 follow-up worklist JSON**.
2. Import the latest **Build 111 closure ledger JSON**, which may have one or several owner reviews. Import validation requires the exact originating worklist, bounded size, ordered timestamps, exact IDs, consistent decisions and reopen counts.
3. Compare the **last two** reviews by exact `(source, identity ID)`, never by name, device address or inferred integration association. The first ledger entry can be presented as a single historical baseline but does not have a prior comparison.
4. Show whether each item is **still open**, **reopened**, **newly owner-attested closed**, **rechecked closed**, or on its first review. Call out stage changes such as registered camera playback falling back to a stream-health hold.
5. Show separate open Home Assistant and camera counts, plus a privacy-safe chronology of every ledger entry, containing timestamps and open/closed/reopen totals.
6. Optionally mark an **unresolved handoff item reviewed** in this browser session. This acknowledgment means only that the written handoff was reviewed, *not* that an integration, physical switch or video was tested. Marks reset when either input file is re-imported.
7. Download a **private identity-only field recheck handoff JSON**, including unresolved items and suggested supervised next steps, owner-attested closed IDs, summary counters and an ordered ledger chronology. No automatic copy, upload, mail, persistence or server call is performed.

## Limits of evidence

- The chain is a chronological summary of local owner-authored JSON records, **not** cryptographically signed or tamper-proof. Its exact schema/summary/ordering are validated at import, but independent field verification remains necessary.
- Previously marked camera moving video is only historical owner testimony, never proof of current moving video. Reopen and health holds remain separate from a review-of-handoff checkbox.
- Do not publish these files: device names and IDs can reveal household/workshop information. No stream URLs, credentials, addresses, raw HA attributes, tokens, passwords or provider telemetry are included.
- This workbench is read-only. It cannot re-add Home Assistant devices, register ONVIF cameras, configure RTSP/go2rtc, reboot Windows/VMs, send MQTT messages, apply database migrations or restore backups.
- A failed Home Assistant registry read remains **UNKNOWN** in the live recovery panel. Build 112 operates only on previously saved valid evidence, not an inferred zero-device state.

## Owner field acceptance steps

- On the installed Windows Hub, collect a fresh Build 107 inventory and follow Build 108–111 receipts through supervised reviews. Make sure source timestamps, local HTTPS availability and HA/camera health are checked separately.
- For missing HA identities, review **Home Assistant → Settings → Devices & services**, integration state, power and network. Physical function tests must be completed independently and explicitly acknowledged in a *new* Build 111 review.
- For cameras, review **Cameras**. Explicit owner-selected ONVIF registration and safe private stream setup precede a fresh camera health probe. Only personally observed moving live video supports a new Build 111 playback closure.
- Then import the resulting Build 110/111 files in the Build 112 section and download the private drift handoff for unresolved work. Do not treat a GitHub check, generated history or checkbox as a physical device repair receipt.

## Engineering verification and rollback

Run `npm run typecheck -w @rosevear-ai-hub/web`, `npm test -w @rosevear-ai-hub/web` and `npm run build -w @rosevear-ai-hub/web`. Independently verify backend, docs, backup and Windows desktop GitHub gates on `dev` and protected `main`.

Rollback removes the Build 112 import and pure analysis/UI/test files; no backend, Windows, database or device changes exist to reverse. Previous Build 110/111 private files remain owner-managed.
