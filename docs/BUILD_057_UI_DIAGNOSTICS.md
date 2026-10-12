# Build 057 operator screenshot review — layout and service diagnostics

These are follow-up UI acceptance corrections to the Build 057 release;
they do not change backend routes, secrets, dependencies, storage or migrations.

## The four screenshots

1. **Business / confirmed story draft:** Product ID, Heading, Summary and Body
   were inline with fields because the connector form had no scoped layout
   styles. Fixed with a stacked responsive form, full-width controls and
   wrapping read buttons. Disabled actions still require encrypted Secrets
   and valid upstream authorization. No automatic publishing.
2. **Home Assistant:** configured URL shown in the screenshot does not specify
   the default HA port `8123`, and the Hub reports a five-second timeout.
   Help now instructs a network and explicit port check from the Windows Hub
   host. This cannot be solved by browser CSS, and no token is displayed.
   Verify the VM address, available API at the intended port and existing
   stored token through the protected configuration workflow.
3. **MQTT:** broker configured at a private address on `1883`; its status
   reports reconnecting, with no active subscriptions. New status guidance
   calls out broker availability, host reachability, credentials, and
   disabled subscribe/publish while disconnected. No test message is sent
   automatically.
4. **Frigate:** optional local API at loopback `127.0.0.1:5000` reports
   offline and no cameras. Marked explicitly optional and offers guidance
   to verify the service when desired; this does not imply the camera
   registry or go2rtc is offline.

### Safe operator acceptance

After updating local source and installing the web build, verify responsive
layouts at common desktop widths and narrow windows. Confirm form labels do
not overlap fields, disabled controls explain why, HA/MQTT offline states
show guidance and never send a command, and Frigate offline does not block
camera navigation. Verify actual integration connectivity separately.

**Code CI GREEN does not prove household service connectivity.** No need to
alter Home Assistant IP addresses, passwords, tokens, broker topics or enable
Frigate until the operator confirms actual service state. Avoid exposing
secret values or posting a live token to issue trackers.
