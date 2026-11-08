# Build 273 — Personalized Home Dashboard Widgets, Saved Layout Preferences & One-Click Layout Reset

## What changed

The authenticated Home screen now offers a small layout panel to reorder, show or hide three **optional** sections: guided next actions, the role-aware operations dashboard, and local AI/knowledge shortcuts. The four essential source status cards (backend, local AI, Comms HOLD, private relay OFF) stay visible regardless of layout choices.

Preferences use a versioned, size-limited, validated schema in the current browser's local storage, keyed by the authenticated user ID. The saved layout contains only widget identifiers and their visibility/order; no credentials, remote calls, permission changes, owner approvals, or device operations. A one-click **Reset Home layout** removes the saved record and restores the default order and visibility. Browser storage failures are reported and leave the current session usable.

## Boundaries and access

- This is **per account, per browser**, not cloud sync or Windows installation.
- The existing role-aware content and allowed navigation remain authoritative. Changing the layout does not add access to privileged workspaces.
- Stored data is rejected if malformed, incompatible, over-size, incomplete or containing unknown/duplicate widget IDs; safe defaults are used.
- If all optional widgets are hidden, an explanation and recovery controls remain visible; essential health/Comms/relay status never disappears.
- There is no modification of Comms trust HOLD/activation, restart behavior, settings authority, or sign-in.

## Verification gates

- Production web build and TypeScript type-check.
- Model, component, App integration, and full web regression tests.
- Protected feature PR → `dev`, protected `dev` → `main`, and separate `main` push CI, each with all required checks GREEN.

GitHub deployment does not automatically update Ree's physical Windows mini-server.
