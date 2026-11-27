# Build 392 — Source of Truth: workshop sample observation association

First verified source gap: Build 377 intentionally leaves signed printer-PC
receipts unbound to workshop equipment and Build 218 lacks a structured Devil n
Dove sample reference. This increment reuses the registered 3D print job and
previously admitted Build 370 receipt. Owner explicitly identifies a sample
reference and exact controller; job revision is checked, audit history is
append-only, duplicate association for the same receipt/device/job is refused.
There is no new database schema or machine action. Prior admission is not
reverification of the signature; physical identity, fit and camera evidence
remain unverified. No business records or customer data are written externally.

Acceptance environment: isolated SQLite, synthetic keys and owner bootstrap,
normal signed receipt intake then sample association; no original Windows
hardware, live login or physical disconnection. The owner screen includes receipt history, elapsed intervals between observations
(not physical downtime), and a separate revision-checked maker-reported
inspection checklist and disposition. No checklist outcome starts equipment,
changes a job stage, or constitutes independently verified fit. Record actual observed field evidence separately; Devil n Dove
order intake remains owned by that application. Never restart equipment.

Windows serial and print queue observations may be explicitly associated even
without OctoPrint. Enumeration is not print progress, machine identity or
proof of physical activity. Manual notes remain excluded from source association.
