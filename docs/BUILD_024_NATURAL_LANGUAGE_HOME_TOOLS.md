# Build 024 — Natural-Language Home Tools

## Purpose

Build 024 connects the Home chat profile to the safe Home Assistant controls from Build 023
without giving an LLM authority to choose or invent a device action.

Natural-language home commands are parsed and resolved by deterministic server code. The local AI
provider is bypassed for recognized home-control imperatives.

## Supported language

Build 024 accepts explicit single-target commands such as:

- turn on Living room lamp
- turn Living room lamp off
- switch on Desk fan
- enable Desk fan
- disable Desk fan
- activate Movie night scene
- run Movie night scene

The target must resolve to the exact Home Assistant friendly name, entity ID, or entity-ID local
name of one light, switch, or scene.

## Resolution rules

1. Only the Home model profile activates natural-language tool resolution.
2. The parser recognizes a bounded action vocabulary.
3. One exact target must resolve.
4. Partial names are never guessed.
5. Duplicate friendly names are treated as ambiguous.
6. Bulk targets such as "all lights" are blocked.
7. Unsupported actions such as toggle, dim, lock, unlock, open, close, arm, or disarm are not sent
   to the model for interpretation.
8. The resolved entity must already be on the Build 023 safe-control allow list.
9. Hazardous/safety-sensitive entities remain blocked.
10. The action must match the entity domain:
    - on/off -> light or switch
    - activate -> scene

## Confirmation rules

Build 024 applies the canonical risk policy as follows:

- **Exact + allow-listed + Level 1 + explicit imperative:** direct execution is allowed. The
  Build 023 Owner/Admin allow list is the user configuration that permits direct Level-1
  execution, and the user's typed imperative is the exact requested action.
- **Partial name:** no execution. The Hub asks the user to restate the command with the exact
  friendly name.
- **Duplicate/ambiguous name:** no execution. The Hub asks for an exact target.
- **Unknown/non-allow-listed target:** no execution.
- **Unsupported action or domain/action mismatch:** no execution.
- **Bulk action:** no execution.
- **Level-3/safety-sensitive target:** never delegated.
- **Read-only account:** no execution.

Build 018 Level-2 confirmation records are not used for these Home tools because Build 024 exposes
only the Build 023 Level-1 tool families. Future Level-2 home actions must use the existing exact
confirmation workflow rather than this direct Level-1 path.

## Chat execution path

For a recognized Home-profile command:

user message
-> deterministic parser
-> exact entity resolver
-> Build 023 allow-list and safety checks
-> Build 023 tool schema / enable-state validation
-> bounded Home Assistant adapter
-> Build 019 audit evidence
-> deterministic assistant result message

The provider is not asked to infer, select, or execute the tool.

For ordinary Home-profile questions that are not recognized commands, normal provider chat remains
unchanged.

## Reliability

Natural-language Home tools do not require Ollama generation once a command is recognized. This
means an allow-listed Home Assistant command can still use the deterministic local control path if
the AI provider is temporarily offline.

If Home Assistant is unavailable, the command is not executed and the chat returns a clear failure
message.

## Persistence

No database migration is required. Build 024 reuses:

- model_profiles
- conversations / chat_messages
- app_settings safe-control allow list
- tool registry
- audit events

## Security impact

Build 024 does not add an arbitrary service-call interface, fuzzy autonomous action selection,
bulk control, lock/security control, or hazardous equipment control.

Recognized unsafe or unsupported imperative language is handled deterministically and is not passed
to the LLM as a possible command.

## Rollback

Revert Build 024. Build 023 button-based safe controls remain available and the Home chat profile
returns to ordinary provider chat behavior.

## Operator setup

No new credential, cloud service, OAuth registration, or paid dependency is required. Keep the
existing Home Assistant URL/token and Build 023 safe-control allow list.

## Next build

Build 025 — MQTT Foundation
