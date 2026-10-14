# Build 069 — Integration Recovery Acceptance & Runtime Reconnect Validation

## Existing household evidence
On 2026-10-14 the operator corrected two Windows Hub .env addresses to
`HOME_ASSISTANT_URL=http://homeassistant.local` and
`MQTT_HOST=homeassistant.local`, retaining tokens, broker port, credentials,
TLS and all existing service configuration. Home Assistant VM, its web API,
Mosquitto add-on, and the Hub backend all remained running. After restarting
only the verified Hub backend, a Chrome Home screenshot reported:
- Home Assistant: Ready — Connected
- MQTT: Ready — Broker connected
- Cameras: Not configured — zero Hub registrations

These operator-observed ready indicators are useful **single-snapshot
evidence**, not proof of entity visibility, delivered MQTT messages, or a
subsequent broker disconnect/reconnect.

## Build 069 implementation
1. MQTT integration tracks `connect_generation`, `last_connected_at`
   and `last_disconnected_at` entirely in memory, under the existing
   client lock, as part of Paho's existing connect/disconnect callbacks.
   Only actual disconnected→connected transitions increase the counter.
   Counters reset with a new Hub runtime; no durable history is claimed.
2. Existing authenticated `GET /api/v1/mqtt/status` includes these
   bounded read-only fields. It neither subscribes nor publishes.
3. **System → Integration health → Build 069 Connection acceptance**
   provides **Capture baseline** and **Recheck connections**. Each
   explicit click reads existing HA status, MQTT status, and only if the
   HA API is available the existing HA entities endpoint.
4. The UI stores and displays only sanitized checks: HA API connected,
   nonnegative entity count or unverified; MQTT connected, active
   subscription count and generation. No entity IDs or states, private
   URLs, MQTT topics or message payloads are displayed.
5. Recheck results distinguish:
   - steady connected across both checks, **no reconnect event verified**;
   - an unavailable/unverified→connected change, recovery observed;
   - increase in MQTT connection generation, callback transition observed;
   - decreased generation, possible backend restart/counter reset, no
     reconnect proof;
   - loss of either connection, still needs attention.
6. The existing Paho auto-reconnect remains untouched; the new panel
   performs no background polling, timers, VM commands, TCP port scanning,
   credential reads, database migrations, or commands to Home Assistant.

## Operator acceptance steps without interrupting services
1. Keep the Windows backend, Vite/Chrome UI, VirtualBox Home Assistant VM,
   and Mosquitto add-on running. Use Chrome
   `http://127.0.0.1:5173/` and sign in.
2. Open **System → Integration health**. Under the Build 069 section, select
   **Capture baseline**. Confirm HA API connected and count of visible
   entities, and MQTT broker connected and subscription count.
3. After normal use, select **Recheck connections**. Stable connection
   across both checks is a PASS for availability, **not a proven reconnect**.
   A changed MQTT generation is evidence of an actual network callback
   transition (from this backend process only).
4. Do not deliberately disconnect the VM, broker, or working client merely
   to force a reconnect for demonstration. Wait for naturally occurring
   reconnection or a separately supervised maintenance window.
5. If the count of visible HA entities is zero, or entity read is
   unverified, assess access permissions and HA entity availability
   separately. MQTT broker connected does **not** mean that a subscription
   exists or a retained message was delivered. If 0 active subscriptions,
   do not auto-subscribe without an approved topic policy and explicit intent.
6. Record sanitized counts, statuses and manual time of checks.
   Never share .env, tokens, passwords, cookie headers or private logs.

## Acceptance boundary
- GitHub checks validate API/client code, unit tests, Windows backup/recovery
  and native executable packaging.
- GitHub GREEN does not indicate the private Windows Hub has been updated;
  nor does it independently certify HA entity visibility or MQTT delivery.
- Real field acceptance requires two on-device observations as above.
- Cameras/Frigate/go2rtc are excluded and require a later build.

**Next queued: Build 070 — Camera Inventory Discovery & Safe Registration Acceptance.**
