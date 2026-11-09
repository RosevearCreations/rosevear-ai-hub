# Rosevear AI Hub 287 — Original Windows owner report, launcher drift and Master Shell readiness

## Scope

The owner I.T. Integration Health screen can explicitly compare a fresh Build 286 read-only launcher response against a bounded history of owner observations. It retains up to five strictly allowlisted browser-local snapshots, under the signed-in owner's local browser scope. The screen identifies possible changes in the updater release candidate, checkout candidate, web process ancestry, backend process ancestry, and Windows startup-task state.

An owner may report *working* only after a recent, internally consistent release-candidate comparison and plausible observed web/backend launcher chains. A detected or incomplete state can be recorded as an owner-reported *issue*. Both require an explicit three-part self-review checklist. The control never restarts services, modifies PowerShell policy, activates a Comms receiver or sends an external report.

## Field instructions for Ree's Windows mini-server

1. On Ree's intended Windows mini-server (not another laptop), open the installed Hub client and sign in using an owner account.
2. Under **I.T. → Integration Health**, first review the Build 285 host/services evidence, then Build 286 release candidates and launcher ancestry.
3. Select **Compare current launcher with owner history** in Build 287. This fetches one read-only inspector observation only when requested.
4. Review the recorded release candidate, checkout candidate, web and backend process kinds, and startup-task state. Note any explicit drift from prior browser-local records.
5. Check the three original-host/installed-file/working-or-issue confirmations only if physically witnessed. Record *working* only for a current internally consistent candidate; record an *issue* for a mismatch or fault.
6. Review the local-only **Master Shell readiness** candidate. The report remains HOLD regardless of self-review. Obtain genuine installed process-to-binary evidence, signed owner consent and an independent witness under the separately approved authority procedure before any go-live claim.

## Evidence boundaries and operations

- Previous local records are not signed, server-held, independently witnessed, or guaranteed to have originated from Ree's original machine. Browser storage can be deleted or edited and does not establish custody.
- Only enum states, SHA candidates, coarse process kinds and timestamps are retained. No PIDs, raw command lines, hostnames, account names, device URLs, freeform notes or credentials.
- Records are versioned, owner-scoped, capped at five and validated on load; stale references over 30 days remain visible but do not count as current. Observations expire after five minutes; no automatic network polling.
- New observations do not silently overwrite history. The previous recorded transition is shown separately so an owner-reported new baseline does not erase the last observed drift.
- Master Shell preview declares original-host, signature, witness and approved report-contract requirements **unmet**. No sender, receiver, webhook, routing grant or cross-tenant data flow is activated.
- This release passes code and CI gates independently of Ree's original Windows machine. Production CI GREEN must never be represented as physical Windows acceptance GREEN.

## Verification

Focused tests cover owner scope, tampered or oversized local data, stale/future observations, drift codes, mismatch/issue distinction, no network activity on mount, explicit acceptance gates, safe errors, history continuity and Master Shell HOLD. Existing backend and web tests continue to protect the read-only launcher endpoint.
