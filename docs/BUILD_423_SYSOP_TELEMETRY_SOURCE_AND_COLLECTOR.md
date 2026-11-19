# Rosevear AI Hub — AIDP Build 423 original-host telemetry source and collector

The Hub now implements the canonical `rosevear.sysop.statistics.v1` source at `GET /internal/rosevear/sysop/telemetry/v1` and an explicit one-pass seven-source collector.

## Hub source

The source only operates on the original Windows host. It requires:
- `ROSEVEAR_SYSOP_TELEMETRY_READ_TOKEN`
- `ROSEVEAR_SYSOP_TELEMETRY_PRIVATE_KEY_PATH`
- `ROSEVEAR_SYSOP_TELEMETRY_SOURCE_COMMIT`

The Hub may include the Windows boot time it observes. The envelope always sets `rebootIsIndependentlyWitnessed=false`; existing independent reboot-witness procedures remain the authority for proving a physical reboot.

## Seven-source collector

Run only after source enrollment:
`python scripts/collect-sysop-telemetry423.py --once`

For each source TAG (AIDP, HUB, COMMS, YW, ICAMP, ROSIE, DEVIL) configure the URL/token plus the existing Build 365 public-key pin, public-key path and exact source commit. Configure the AIDP protected intake URL/token separately.

The collector verifies every signed source envelope locally with the Build 365 verifier before forwarding it to AIDP. A failed source, stale signature, wrong commit, wrong pin or failed AIDP intake stays HOLD. This script does not install itself as a Windows service or scheduled task and authorizes no reboot/recovery/message/payment/export.

Coordination issue: #825.
