# Build 072 — Multi-Brand Camera Inventory & Alexa Compatibility Assessment

## Implemented
- Cameras page includes an opt-in, browser-session compatibility planning worksheet for Blink, littlelf, Nooie, Netvue, Alarm.com, SkyBell, IQ Panel, and other equipment.
- Exact model and optional room are entered by the operator and can be removed or copied as JSON for private follow-up.
- No server persistence, credential intake, subnet enumeration, ONVIF writes, camera registration, camera activation or stream interception is introduced.
- Existing Build 070/071 discovery, encrypted RTSP transport, and manual playback acceptance are unchanged.
- Manufacturer-specific guidance is deliberately conservative: Alexa viewing may use an authorized manufacturer skill and **does not imply** third-party RTSP/ONVIF access.

## Acceptance
1. Open Cameras with the current owner account. Confirm existing inventory, encrypted streams and go2rtc status remain unchanged.
2. Add example models for two different brands; confirm both appear and their classification remains Unverified.
3. Remove an item; confirm only that worksheet row disappears.
4. Copy the JSON using a secure browser context; verify the model information only, no credentials or tokens.
5. Reload; confirm session worksheet does not claim persistence.
6. Verify Home Assistant and MQTT remain connected and that cameras were not scanned automatically.

## Release/limitations
This is a manual compatibility assessment, **not** persistent camera inventory or live manufacturer integrations. The Alexa CameraStreamController contract is an Alexa skill/provider integration, not an authorized feed-extraction endpoint for third-party apps. Exact device manuals and permitted APIs must be verified before implementation.

For CI GREEN, require docs, backend, web, Windows backup, and desktop jobs on the feature branch/PR and on each merged branch. Actual Windows camera playback requires separate operator evidence and cannot be inferred from GitHub CI.

## Next candidate
Build 073 — Model-specific compatibility verification and owner-approved connection methods (persistent inventory subject to explicit design review).
