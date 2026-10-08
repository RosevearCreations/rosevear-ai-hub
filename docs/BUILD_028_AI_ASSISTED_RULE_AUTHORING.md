# Build 028 — AI-Assisted Rule Authoring

## Status

Implementation is on `dev` pending exact-head CI and promotion evidence.

## Scope

Build 028 implements the canonical Source-of-Truth flow:

User request
→ AI proposes a structured rule
→ server validates schema and permissions
→ human reviews
→ exact Level-2 confirmation
→ rule saved
→ Build 027 Event Engine executes later

The AI is an authoring assistant only. It cannot insert, enable, approve, or execute an automation.

## Authoring context

The server provides the selected provider with bounded, non-secret context:
- Rule Schema v1
- Event Engine-supported Home Assistant action tool contracts
- current tool enabled/risk state
- up to 250 current Home Assistant entity IDs, states, friendly names, and units
- current Build 023 safe-control entity allow list
- current Build 025 MQTT topic allow list

Home Assistant tokens, MQTT passwords, cookies, session IDs, encrypted secret values, and other
credentials are never part of the model prompt.

Entity names, states, MQTT strings, and the user's request are explicitly labelled untrusted data in
the server-owned system instruction.

## Provider boundary

The endpoint uses the Build 009 provider registry rather than calling Ollama directly. The current UI
uses the local Ollama model inventory, while the backend contract remains provider-neutral.

Requests are bounded to 4,000 characters. Generated output is bounded to 32,000 characters and uses
the existing conservative provider retry/cooldown state.

## Deterministic validation

Provider output must be one strict JSON object containing:
- name
- Rule Schema v1 definition
- explanation
- assumptions

The server then:
1. parses JSON
2. validates the strict Build 026 Pydantic schema
3. validates every referenced tool against the live registry
4. requires every action tool to be a Build 027 deterministic executor
5. rejects disabled, Level-2, and Level-3 tools
6. validates every action argument object against the registered JSON schema
7. cross-checks Home Assistant trigger/condition entities when state inventory is available
8. warns when an action target is outside the safe-control allow list
9. warns when an MQTT trigger conflicts with configured topic policy

Warnings are review evidence; they are never silently rewritten into a different rule.

## Human review and persistence

The Automations workbench displays:
- proposed name
- explanation
- assumptions
- warnings
- exact Rule Schema JSON
- Event Engine runtime status
- existing saved rules

The draft is transient and defaults to disabled creation. Choosing **Prepare exact save confirmation**
uses the existing `automation.rule.change` Level-2 tool. The user must then choose **Approve and
create this exact rule** before the existing Build 026 apply endpoint can persist it.

Changing the rule after confirmation invalidates the exact-action binding, as before.

## Audit/privacy

Authoring outcomes are audit-recorded, but the natural-language prompt and raw provider response are
not persisted in audit payloads. Evidence contains provider/model identifiers, prompt length,
validation outcome, referenced tool keys, and warning count.

## API

`POST /api/v1/automations/author/draft`

Owner/Administrator only.

Request:
- prompt
- provider
- model

Response:
- validated name/definition
- explanation/assumptions
- deterministic warnings
- referenced tools
- provider/model
- `recommended_enabled=false`

Persistence continues through:
- `POST /api/v1/automations/confirm`
- Build 018 confirmation approval
- `POST /api/v1/automations/apply`

## Tests

Coverage verifies:
- valid AI output is schema/tool-validated but not persisted
- authoring context includes the expected safe tool/entity metadata
- authoring audit evidence excludes prompt plaintext
- invalid action arguments are rejected before human review
- Household User authoring is denied
- the web workbench can draft, review, prepare exact confirmation, approve, and create a disabled rule

## Non-scope

Build 028 does not:
- bypass the Build 018 confirmation workflow
- autonomously save or enable AI output
- change Event Engine execution semantics
- add automation history/failure recovery (Build 029)
- add notification actions (Build 030)
- add a new AI provider or cloud dependency
- persist AI drafts or raw prompts
- add a database migration

## Rollback

Deploy the prior application version. No schema downgrade is required.
