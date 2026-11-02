# Build 220 — Local AI Model Health, Usage & Resource Budget

An owner/administrator-only **System → Local AI model health & resource budget** panel performs one manual, read-only check of the configured local Ollama runtime. Nothing is measured until the owner clicks the button. The check reads `/api/version`, `/api/tags`, `/api/ps` and the existing API/host workspace resource-budget snapshot. It **does not** generate a model response, load a model, benchmark inference, download weights, poll in the background, send telemetry to a cloud service, or change Ollama configuration.

The panel reports installed artifact sizes, parameter/quantization details, observed resident size and Ollama VRAM where supported, check duration, host available RAM, workspace free disk and Hub warning guidelines. Reported model artifact sizes may share storage; they are not disk utilization or peak-RAM promises. Ollama `/api/ps` exposes a momentary loaded-model list, not historical usage, sustained utilization or a performance benchmark. Unavailable/timeout states remain explicitly unknown, never a misleading zero.

## Owner acceptance

1. Open the System area as owner/administrator. Before clicking, verify no `/health-budget` request is made.
2. Click **Check local AI models & resources**. Compare installed names and reported sizes to `ollama list`; compare loaded-model readback to `ollama ps`, if available.
3. Observe the timestamp and one-time duration. With Ollama stopped or inaccessible, confirm the inventory reads **unknown, not zero**. With `/api/ps` unavailable, confirm installed inventory remains displayed while residency is **unknown**.
4. Check the measured available host RAM/free workspace disk against the shared Windows host's actual resource manager; maintain headroom for Home Assistant, camera playback and Hub services. Favor smaller quantized models for constrained resources, but choose only after actual workload testing.
5. Check read-only/household role denial and that no prompts, model downloads, tuning or unsolicited remote telemetry occur. Retest after starting Ollama using the button.

Source CI verifies routes and UI behavior; **it does not prove installed Windows model availability, inference responsiveness or production-device resource safety**. QL-275 stays deferred; no private relay or device automation is activated.
