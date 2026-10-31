# Build 210 — Windows startup dependency map and guided recovery readback

The existing Build 146 owner Windows Startup Console now includes an ordered eight-stage startup dependency map. It explains which earlier Windows task, original Home Assistant VM, broker or local service each stage relies on, its **actual source**, and a safe manual inspection step.

Home Assistant, MQTT, Ollama and the Hub backend use only already authorized on-demand API classifications. Windows task presence, the browser/web client, Caddy HTTPS and Tailscale are **unverified** because there is no independent process/client probe. A responding API does not prove a process started at Windows boot. This change adds **no** process start, stop, restart, VM creation, firewall modification, network scan or additional poll.

The original strict classified Windows-task importer, before/current snapshots, owner manual checklist and independent Windows acceptance HOLD remain unchanged. The source UI is not installed-Windows verification.

Run `npm run build:210:hub:test`, the full web suite, TypeScript/Vite build and five-job feature, `dev` and exact-main CI.

QL-275 stays **Under Review / owner deferred**, and integration remains **DISCONNECTED/HOLD**, private relay OFF, authenticated gateway GETs 0. First-party vault stays SECURITY HOLD.

**Next Build 211 — Installed Version, Configuration Drift & Release-to-Device Verification (QL-275 Deferred).**
