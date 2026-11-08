# Build 278 — Current I.T. Truth, Legacy Checklist Retirement & Branch Audit

## Current I.T. work, not historical test gates

The System overview and command shortcuts now distinguish three **current, evidence-driven** checks:

1. **Protected GitHub release:** inspect the real `main` and required CI. A green source release is not proof that Ree's Windows mini-server has installed or started that release.
2. **Actual Windows host:** before a real deployment or restart, check the installed client/build, original process identity, startup and recovery tasks, backup, and Home Assistant VM state on that host. No old local worksheet can substitute for this evidence.
3. **Comms trust and activation:** the Hub UI remains `DISCONNECTED / HOLD` until an authentic owner-approved, signed private connection receipt is verified. Past contract/simulation tests do not authorize a relay.

The former prominent QL-275 status on the System landing page is replaced with the **current Comms HOLD** boundary. Older Build 200 theme acceptance, Build 228–242 visual/restart owner worksheets, QL-275 owner review and Build 227 six-app planning checklist remain available under collapsed **Historical / optional reference** sections. They are **no longer presented as routine Home, System, I.T. navigation or GitHub source-release prerequisites**. Opening an archived worksheet does not change source trust, approval, Windows services, local settings or evidence retention. Its real safety steps still apply when performing that particular physical operation.

This is a UI classification, not a retroactive statement that an original owner, witness, Windows field observation or signed Comms receipt has occurred. No owner checkboxes are auto-completed, no audit entries are deleted, and no bypass is introduced.

## Repository branch audit (November 8, 2026)

An authenticated Git read-only inventory listed **80 remote heads** including protected `dev` and `main`. After Build 277's merge to `main`, exact commit ancestry showed **30 other heads** wholly reachable from both protected branches; these are recoverable history pointers, not the sole copies of any commits:

```
build-255-queue-sla-windows-handoff
build-256-windows-signed-process-review
build-257-windows-chain-signatures
build-258-windows-identity
build-259-launcher-custody
build-260-supervised-release-handoff
build-261-installed-process-proof
build-262-dark-contrast-runtime-client
build-263-original-windows-launcher-receipt
build-264-windows-field-test
build-265-comms-receipts
build-266-private-audit-nonce-closure
build-267-private-source-truth
build-268-receiver-auth-trial-gate
build/269-personal-workspace-quick-access
build/270-guided-workspace-finder
build/271-workspace-navigation-recovery
build/272-role-aware-home-guidance
build/273-personalized-home-widgets
build/274-home-activity-alerts
build/275-notification-triage
build/276-alert-detail-preview
build/277-alert-search-paging
codex/ql338-local-hub-source
codex/ql339a-windows-relay-test-hold-20261105
codex/ql364-ci-navigation-speed-dev
codex/ql364-ci-navigation-speed-main
codex/ql364-source-health-dev
codex/ql364-source-health-main
fix/ql365d-ai-hub-attachment
```

The remaining **48 non-protected heads** contained at least one commit not yet reachable from both branches at the updated snapshot. This group must be re-evaluated after subsequent promotions and individually reviewed for unique work; do **not** delete such heads merely to meet an arbitrary two-branch count. A feature branch confirmed merged to `dev` but not `main` is not yet eligible.

**Cleanup outcome:** Following a separate action-time owner confirmation, all 30 listed merged branch names were removed through the authenticated GitHub branches interface. Each displayed GitHub's **Deleted / Restore** state after the action; the browser's refreshed branch list retained `dev` and `main`. An independent remote-head count confirmed **50 remaining heads** immediately after cleanup (the two protected branches plus 48 branches with unique history), before this Build 278 release branch was published. No original audit evidence or commits were intentionally erased. The repository's two-branch target remains open until unique work is safely reconciled.

### Safe cleanup procedure

- Refresh `dev` and `main`, inspect the complete remote branch inventory, and re-evaluate `git merge-base --is-ancestor` against **both** heads immediately before deletion.
- Retain `dev`, `main` and any branch containing unmerged commits. Do not force-delete protected refs, rebase, overwrite or force-merge unique work.
- Remove only confirmed fully merged refs using the authorized GitHub website and its normal confirmation flow; verify the branch list afterward. A removed branch name can be recreated from its known SHA while GitHub retains the commit, but recovery is not guaranteed indefinitely.
- Report exact deleted/retained counts, any browser authorization or confirmation blocker, and whether additional review is needed.

## Verification

Focused web tests check the current status labels, historical disclosure controls, intact live I.T. health actions, permission-safe navigation and unchanged Comms HOLD. Run the full web regression and production build; promote through protected feature → `dev` → `main` PRs and separately verify the independent `main` push CI before claiming GitHub production GREEN. GitHub release does not install or field-certify Ree's Windows machine.
