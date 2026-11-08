# Build 272 — Role-Aware Home Dashboard, Clear Next Actions & Safe Empty States

## Scope

The authenticated Home workspace now starts with a concise three-card daily guide ahead of the detailed operations dashboard:

1. **Hub** uses the existing backend health request and distinguishes checking, responded, and failed-to-respond.
2. **Local AI** uses existing Ollama status, reports missing models explicitly, and offers Chat only with a verified nonzero local model count. An unconfigured Chat shortcut on Home remains disabled.
3. **Next workspace** offers Workshop to owner/administrator roles and Knowledge to other authenticated roles.

All destinations pass through the authenticated app's existing `allowedSections` list. There is no new API request, background repair, provider activation, credential change, device command, or Comms trust-state change. An allowed button only navigates within the current session. A health response is described as an observation, not proof of local Windows startup or external services.

## Safe empty and denied states

- Loading state: no action is offered before a service response arrives.
- Offline state: review route appears only if that route is allowed; the UI does not claim a service is ready.
- Zero, missing, or invalid model count: Chat is not offered as a ready action.
- Missing/unauthorized workspace: the action disappears while the explanatory card remains visible.
- Read-only accounts do not receive administrative or Workshop action buttons.

## Verification

- `npm run web:build`
- `npm --workspace apps/web run test -- --maxWorkers=1`
- Source → `dev` → protected `main` checks, then a separate successful `main` push CI run; no production GREEN claim until all are complete.

The GitHub release does **not** itself update the physical Windows AI Hub machine; the local installation remains a separate operational step.
