# Build 390 — Rosie Dazzlers and local MQTT integration boundary

The existing MQTT client uses Paho and an authenticated, allow-listed broker.
A configured username/password is not a successful broker login. A failed
automatic transport attempt now reports a fixed redacted reason, without
revealing the endpoint or claiming a specific network or TLS cause.

## Deployment and acceptance

1. Confirm the existing broker and its actual location on the original Windows
   Hub/HA VM, listener, configured MQTT_HOST, MQTT_PORT and MQTT_TLS. Check
   credentials only if the broker reports authentication rejection. Do not
   install a second broker or open router/firewall ports to the public internet.
2. Verify the authenticated Hub MQTT connection and a broker-authorized,
   exact non-retained test topic. Existing wildcard subscriptions must exactly
   match an allowed filter; a narrower wildcard is not implicitly permitted.
3. Rosie Dazzlers is a separate application. Preserve its authenticated HTTPS
   signed source receipt path (Build 367 collector and Rosie original evidence
   enrollment). If an approved local bridge is added, it must verify the
   signed source envelope and freshness/replay custody before publishing a
   minimal non-customer operational status event to a dedicated namespace,
   e.g. rosevear/rosiedazzlers/telemetry/status. A dedicated broker ACL should
   allow only the bridge to publish that topic and the Hub to subscribe.
4. Do not send customer names, bookings, addresses, payment data, credentials,
   commands or raw logs through household MQTT. Broker authorization is not
   source identity; a received topic is not a three-Master ACK. Never enable
   QL-340C or physical automation as part of this integration.
5. An actual Rosie source endpoint, broker login, permitted topic, bridge
   deployment, and authenticated end-to-end receipt are required for live
   acceptance. This change does not create a bridge, install software, restart
   services, publish an event, or claim that the live broker is recovered.
