# Build 068 — Supervised Runtime Recovery & Home Assistant / MQTT Evidence

## Why this build
On the household Windows installation, the Hub API returned `status: ok`
and Chrome authenticated correctly. The Home dashboard then reported both
Home Assistant and MQTT **configured but unavailable**; camera inventory
had zero Hub registrations. Those are separate states, not 401 errors.
Earlier local logs included repeated Home Assistant listener timeouts.

This build **does not claim a physical service restart or recovered VM**.
GitHub CI cannot reach the household Home Assistant VM or MQTT broker.

## What's implemented
- HA status now includes a bounded, sanitized `recovery_reason`:
  `connected`, `not_configured`, `invalid_configuration`, `timeout`,
  `authentication_rejected`, `unreachable`,
  `unexpected_response` or `unknown`.
- MQTT status likewise includes `connected`, `not_configured`,
  `starting_or_reconnecting`, `broker_rejected_credentials`,
  `broker_rejected_connection`, `disconnected_reconnecting` or `unknown`.
  Paho reason codes 4, 5, 0x86 and 0x87 indicate broker credential rejection,
  but this is not a substitute for checking the actual broker logs.
- The Home dashboard and **System → Check integration health** translate
  only allow-listed codes into fixed, safe operator guidance. Raw errors,
  private hostnames, access tokens, usernames and MQTT topic names are never
  repeated in these new status explanations.
- Regression tests cover timeout, unreachable, bad-token and bad-broker-
  credential classification, and verify the UI hides secret-bearing messages.
- There are **no automatic retries**, writes, broker publishes, service
  restarts, VM changes, migration, session invalidation or server updates
  performed by the new diagnostics.

## Windows acceptance — in order, no restarts until necessary

1. **Leave Hub running.** In Chrome open `http://127.0.0.1:5173/`,
   sign in, open **System → Check integration health**.
   Record only the sanitized HA/MQTT status and reason text; do not send
   passwords, tokens, environment files or full private URLs.
2. **Check Home Assistant VM first.** On the Windows machine, confirm the
   existing VirtualBox Home Assistant VM is powered on. Open its usual
   private LAN interface (`http://<existing-HA-address>:8123`) in
   Chrome. If the login page won't load, diagnose the existing VM's network,
   boot status and IP address. Do not create another VM, reinstall HA,
   or reset tokens.
3. **If HA responds**, verify the Hub's saved Home Assistant URL matches
   the VM's current LAN address and port. If `authentication_rejected`,
   check whether the long-lived token is still valid using the existing
   protected Secrets workflow. Do not change it until confirmed invalid.
   If `timeout`, check VM resource use and HA logs rather than assuming
   credentials are wrong.
4. **MQTT broker follows HA** if Mosquitto is a Home Assistant add-on:
   check the **existing** broker add-on's running state and log in Home
   Assistant. Confirm whether its configured port is 1883 (plain) or
   8883 (TLS), and whether the Hub's settings match. If
   `broker_rejected_credentials`, check the configured MQTT account
   privately; if `starting_or_reconnecting`, allow the existing Paho
   reconnect loop to proceed and check the actual broker listener.
   Do not install a second broker or publish a test command.
5. **Accept recovered** only when the Chrome Home cards show **Connected**
   and **Broker connected**, with expected HA entities and MQTT subscription
   evidence checked independently where relevant. A TCP connection alone
   is not proof of authenticated MQTT operation.
6. **Desktop client** remains a separate acceptance check after backend,
   Chrome, HA and MQTT are stable. No app restart is required to look
   at this evidence; refresh the two status views manually.

### Minimal read-only Windows probes (optional)
Run only with the addresses *already configured on your own machine*.
These do not log in or start/stop anything:

```powershell
Test-NetConnection -ComputerName <HA-VM-host> -Port 8123 -InformationLevel Quiet
Test-NetConnection -ComputerName <MQTT-broker-host> -Port 1883 -InformationLevel Quiet
```

These are **reachability checks**, not proof of Home Assistant token validity
or MQTT authentication. Use the configured broker port rather than assuming
1883 when TLS is enabled.

## Other areas
Camera Hub registrations remain zero on the previously observed database.
Do not scan or auto-import cameras as part of the HA/MQTT recovery. Frigate,
go2rtc, cameras, Ollama and business connectors need separate operator
acceptance after auth and HA/MQTT are proven healthy.

## Release criteria and guardrails
- Backend and web tests, Windows desktop build, backup/recovery and docs must
  each be GREEN on `dev`, PR and independent post-merge `main` CI.
- CI GREEN is **source/build promotion only**. Real Windows recovery
  acceptance is still outstanding until manually verified.
- The Hub backend and desktop client must not be stopped or restarted as a
  side effect of gathering HA/MQTT evidence.
- Prior Build 066 operator attestations remain unmodified; reporting
  a status is not certification that a physical service is restored.

Next queued: **Build 069 — Integration Recovery Acceptance & Runtime Reconnect Validation**.
