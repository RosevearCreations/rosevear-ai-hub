# Decisions to Make

These decisions do not block Build 001.

## 1. Repository visibility
**Decision:** Private.

## 2. Public license
**Current decision:** No public open-source license yet. Revisit only if the repository becomes public.

## 3. First permanent host
Options:
- existing Windows PC
- dedicated Windows mini PC
- dedicated Linux mini PC

**Current direction:** Develop on available Windows hardware; decide permanent host after MVP resource measurements.

## 4. Home Assistant
Determine whether an existing Home Assistant instance will be used. If not, install before Phase 4.

## 5. Ollama hardware
Inventory CPU, RAM, GPU, and VRAM before selecting default models.

## 6. Remote access
**Preferred direction:** Tailscale. Do not enable remote access until the local MVP is stable.

## 7. Camera recording platform
Decide whether Frigate becomes the local NVR/event source or remains optional after exact camera inventory is known.
