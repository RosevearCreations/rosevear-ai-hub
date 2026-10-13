# Build 059 — Conversation, Voice and Knowledge UX

## Scope and acceptance

- Chat's selected profile, provider and local model remain visible. A new guided step **Check this question in Knowledge** passes the *editable question only* through in-memory React state; it never automatically searches, generates or publishes.
- A running chat response disables New chat and conversation switching, avoiding a reply landing in the wrong conversation. Stop finishes/aborts through existing mechanisms.
- If creation of the first conversation fails, preserve the typed draft, show the error and allow a manual retry.
- On the Knowledge screen the imported question is clearly marked as a draft. A separate **Search** retrieves relevant local evidence; **Ask with citations** uses existing guarded and grounded local generation.
- Changing text, collection, source or search mode hides stale retrieved results and answers. A grounded answer requires search evidence for the current question. Source citations still open only through authenticated local evidence routes.
- Microphone capture remains user-initiated via Record locally, requires browser permission and a working local Whisper setup; all recognized text is editable. Voice command execution still requires a separate server preview, exact target and confirmation. Local speech output remains user-initiated.
- Responsive Chat/Knowledge hints improve small-screen readability and keyboard flow.

## Non-scope and security

No new API route, database migration, external provider, paid dependency, telemetry,
background speech capture, always-listening wake-word, auto-publication, auto-device
control or new authorization. Questions move only in component memory, not a URL,
browser storage, external service or log. Existing audio privacy and confirm-once
controls remain authoritative.

## Owner-operated Windows acceptance (step by step)

1. **Back up first.** Preserve a verified encrypted Hub backup and a separate passphrase
   before making any local changes. Do not overwrite working `.env`, Ollama models,
   camera settings, Home Assistant VM or MQTT configuration.
2. In a browser open the [main release history](https://github.com/RosevearCreations/rosevear-ai-hub/actions)
   and confirm the Build 059 independent `main` push shows all five checks GREEN.
3. On our Windows server use our existing **backend updater/restart PowerShell script**
   (the script that successfully verified Hub backend process ownership in Build 056).
   Check its displayed errors; do not launch a second unverified backend. Build 059
   has **no database migration**, so do not run Alembic for this build.
4. Run the **client update/restart script** that already works. Open the usual local
   Hub client and hard refresh (`Ctrl+Shift+R`) if an old screen is cached.
5. Sign in; open **Chat**. Choose an installed Ollama model and a profile. Confirm the
   selection is readable and available. Type a harmless question, e.g. "What is in
   our local workshop notes?" and choose **Check this question in Knowledge**.
6. On **Knowledge**, check that the question appears but no retrieval has yet started.
   Choose a local collection and manually select **Search**. Confirm returned document
   evidence links lead to the expected source. **Ask with citations** only after Search.
   If no source is indexed, verify a clear empty-evidence outcome; never claim
   uncited output is sourced.
7. Change the search text or source selection: old evidence and answer must disappear.
   In Chat start a generation and check New chat and the conversation list are disabled
   until generation finishes or Stop is used. Try this only with benign requests.
8. Optional voice checks: on Chat select **Record locally**, grant permission when
   requested, finish a short recording and edit its draft. Do not press an executable
   command confirmation for a live device during smoke testing. Confirm that nothing
   automatically sends, records continuously, or plays voice.
9. Check Chat, Knowledge and Voice at desktop width and at a narrow browser width.
   Report any overlapping controls, missing buttons or accessibility issues with a
   screenshot and the browser console error text, omitting credentials.
10. Finally verify `/health` and `/version` through our existing local checks;
    confirm Ollama, Home Assistant, MQTT and cameras remain unchanged.

## Tests and rollback

The CI matrix must pass documentation, Python backend checks, React tests/typecheck/build,
Windows encrypted backup recovery and Windows desktop build (5/5) on dev, the main PR
and the **independent main push**. GitHub GREEN proves code build quality, *not*
the physical Windows server's installation or a real microphone/source system.
Rollback: select the previously verified version of the client and restart it,
while leaving the existing backend, database and business systems intact; this
build introduces no schema migration or automatic external actions.

**Next queued: Build 060 — Guided Release Adoption & Practical Workflow Acceptance.**
