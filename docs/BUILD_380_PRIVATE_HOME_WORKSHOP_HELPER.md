# Build 380 — Private AI Helper Across Home and Workshop

**Source proposed for protected promotion; original Windows host FIELD_HOLD.**

## Existing foundation reused

Build006/007 Ollama discovery and chat, Build015/055 knowledge ingestion,
indexing, local-only collection metadata, owner/admin source-review decisions,
retrieval (Ollama embeddings with keyword fallback), evidence-location labels,
and citation verification; Build059 local Whisper transcription and local TTS.

This release does **not** claim these capabilities were missing, or activate
an unreviewed source, unattended microphone, or a live home/workshop control.

## Added workflow

- Owner/admin-only **Assistant** navigation/workspace and matching server
  `/api/v1/private-helper-380` with source, context and ask routes.
  Household/read-only users receive 403 and cannot see the workspace in the
  allowed section list. No unauthenticated result cache (`no-store`).
- The helper lists only **already indexed**, **local-only**, **explicitly
  approved** documents whose `hub_source_review.status` was set to
  `approved` by a recorded reviewer. Flagged, unreviewed, unindexed and
  non-local sources do not become eligible. Each request must explicitly
  select 1–8 unique approved IDs. It never self-approves source data.
- The operator may select a registered **home** or **workshop** device as
  question context. IDs are looked up exactly in the persisted local
  inventory/registry, with provenance/observations marked **unverified**.
  No name-based automatic linking, physical identity claim or execution.
- One explicit request finds at most four relevant indexed evidence chunks.
  Retrieval tries local Ollama embeddings, falling back to **local keyword
  search** if embeddings are unavailable. Empty results produce an honest
  insufficient-evidence response; the helper never guesses a source.
- An optional locally installed Ollama model can synthesize a bounded
  citation-grounded answer. The response is accepted only if existing
  `[K#]` references point to the retrieved approved chunks. Missing,
  invented or non-compliant citations fall back to **literal sourced
  excerpts** (up to 600 characters each), not an invented completion.
  This is *citation-format verification*, not a guarantee of truth.
- If no model is selected, Ollama is unreachable, offline or generates an
  oversized response, approved quotes are still available. No cloud
  provider, web search, retrieval beyond the explicit allowlist,
  auto-ordering, machine command, Home Assistant actuation, MQTT publish,
  external app notification or payment is possible through this router.
- Voice is strictly **opt-in**: existing local speech component records up
  to 20 seconds on a real click and places an editable transcript in the
  question. No automatic submit. Existing local TTS plays only when
  `Read answer aloud locally` is clicked, with a stop button and excerpt
  bound. An unavailable microphone/speech/model does not block typing or
  quoted evidence fallback.
- Only query metadata (count, context kind, status, citation count) is
  appended to local audit. Private questions, answers, device names and
  manual text are **not** copied into the audit record.
- The frontend remains responsive, theme-neutral, keyboard labelled
  and separate from the existing Chat command-capable profiles. No new
  database tables or migration: it reuses existing data models and
  owner-reviewed source status. The Build379 migration `0040` remains
  the database prerequisite if the original Windows installation is older.

## Source-level acceptance

Protected checks must pass backend, web (including new tests), Windows
desktop, Windows backup, documentation and CI budget **on each candidate**.
Backend tests cover owner/reader denial, source approval and local-only
requirements, allowlist enforcement, no-model excerpts, fake citation
rejection, offline Ollama/embedding fallback, invalid device IDs, bounded
output and zero device/external action markers. Web tests verify manual
source selection and that no prompt is submitted until explicit Ask.

## Supervised original Windows field acceptance — NOT performed here

1. On Ree's original Windows Hub, first verify a **restorable off-machine
   backup** and installed prior migration `0040`, then use normal supervised
   update/rollback tooling. No new schema migration for Build380.
2. Log in as owner, verify the Assistant workspace appears; log in with a
   separate read-only/family account and verify both navigation and API
   reject access without leaking private source titles.
3. Import a harmless sample manual through Knowledge, index it, review it
   as approved, then explicitly choose it in Assistant. Verify only this
   source is quoted. Flag or revoke approval and check immediate rejection.
   Remove clearly identified sample records using existing documented
   source deletion approval controls.
4. With Ollama online: select a locally installed model and ask a simple
   sourced question. Check cited chunk IDs and quoted text against the
   original indexed document. Ask an unsupported question; reject/quote
   rather than presenting uncited authority.
5. Stop Ollama for a supervised negative test and confirm keyword excerpt
   fallback without an external service call. Restore Ollama normally.
6. Optionally consent to a short local recording, edit the transcript, and
   manually submit it. Check opt-in TTS playback/stop on actual Firefox
   desktop and mobile/tablet. Never run device controls or hazardous tools
   during voice testing.
7. Verify owner-selected home/workshop context is labelled an *unverified
   local reference*, with no MQTT, Home Assistant control, equipment,
   contact, calendar or commerce side effect. Check live process health and
   standard rollback acceptance before marking FIELD GREEN.

## Rollback and limitations

Rolling back this feature reverts the new helper router and UI, but does not
delete any knowledge sources or audit events. Existing knowledge/source
reviews and source permissions are unchanged. Never claim LLM-cited text is
an independent safety certification for kilns, furnaces, lasers or motors.
GitHub source GREEN cannot certify installed runtime, Ollama operation,
original microphone permission or real hardware.

**Next proposed: Build381 — Resilient Windows Boot, Network Sequencing & Local
Recovery.** Seven numbered goals 381–387 remain, plus original displaced
radio/MQTT provenance scope.

References:
- https://docs.python.org/3/library/zoneinfo.html
- https://fastapi.tiangolo.com/tutorial/dependencies/
- https://owasp.org/www-project-top-ten/
