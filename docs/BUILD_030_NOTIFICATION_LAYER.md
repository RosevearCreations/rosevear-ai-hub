# Build 030 — Notification Layer

## Status

Feature promotion verified on main.

- final feature dev CI: run 37875622964 — GREEN
- feature promotion: PR #44
- feature merge: 94d082716804e4810b4bbf2c950a9ca710feb436
- feature main Production CI: run 37876478895 — GREEN
- release-evidence closeout: pending this documentation-only closeout commit

## Scope

Build 030 adds a persistent local household notification layer and connects it to the deterministic
automation engine.

Implemented:
- persistent local notifications
- per-user read and dismiss receipts
- info, warning, and urgent severity
- authenticated inbox list, summary, and filtering
- Owner/Admin local test notification
- Level-1 notification.household.send tool
- deterministic Event Engine execution
- AI authoring visibility through the existing executable-tool context
- Notifications web section
- contextual circled-i help on every primary web section
- safe Windows test-server update script for post-release use

## Safety boundary

A Build 030 notification is an in-app database record only.

It does not send email, SMS, invoke a webhook, use mobile push, contact a cloud notification
provider, or expose recipient phone and email data.

The Source of Truth classifies household notification as Level 1 and external messaging as Level 2.
Build 030 implements only the former.

## Automation execution

notification.household.send accepts:
- title from 1 to 160 characters
- message from 1 to 2,000 characters
- severity of info, warning, or urgent

The tool is code-owned, enabled by default, schema-validated immediately before execution, and
audit-recorded. It can run without Home Assistant because it writes local Hub state.

## Inbox model

One shared notifications row is visible to authenticated household accounts. A separate
notification_receipts row stores each user's read and dismiss state.

This prevents one account from clearing another account's alert.

## Contextual help

The application shell renders a reusable circled i help control for Home, Chat, Knowledge, Devices,
MQTT, Notifications, System, Automations, Confirmations, Audit, Secrets, Tools, and Users.

Each topic contains purpose, common tasks, safety and permissions, and troubleshooting guidance.

## Migration

Alembic revision 0014 creates notifications and notification_receipts. The migration is reversible
to 0013.

## Test PC boundary

The user requested that the test PC be updated only after Build 030 is fully promoted and GREEN on
main.

Build 030 therefore includes scripts/update-test-server.ps1. It requires the exact verified
40-character release SHA and refuses to proceed when tracked local changes exist, origin/main does
not equal that SHA, or local main cannot fast-forward to that SHA.

The actual test-PC update is a post-release manual step because this repository has no self-hosted
runner or remote-execution connector.

## Tests

Acceptance coverage includes local notification persistence, per-user unread and dismiss behavior,
summary and filter APIs, audit evidence, deterministic automation notification action, migration
schema and reversibility, tool-registry Level-1 contract and counts, Notifications UI flows, and
contextual help for every primary section.

## Rollback

Stop the Hub, downgrade Alembic to 0013, and deploy the prior verified release.

## External setup

None.
