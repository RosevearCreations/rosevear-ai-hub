# Build 055 — Knowledge Projects & Collection Workspace

Version: **0.0.55**. Next: **Build 056 — Automations Operations Console**.

## Scope

- Knowledge > Knowledge projects displays a per-collection document inventory,
  indexing readiness and explicit local-only status. Collections can represent
  any of our home, workshop or business projects; none is hardcoded.
- Owner/Administrator may set **needs_review**, **approved** or **flagged** and
  keep a private 500-character assessment on an existing source. This is Hub
  metadata, **not** approval to publish, upload, train on or execute any content.
- The review is stored inside the existing document `metadata_json` under
  `hub_source_review`, preserving original ingestion fields; **no database
  migration**. Review updates are audited without copying private note text.
  A read-only user cannot retrieve review notes or change statuses.
- Review notes are not in document listing, search results, or citation
  evidence; they appear only in the owner/admin project review screen.
- Filter documents by indexed/needs indexing/review status. The **Search this
  project** button scopes existing keyword/semantic search and grounded
  citation links to the chosen collection.
- Manual index queue permits at most **three** unique, not-yet-indexed
  documents from the selected project per confirmation; runs sequentially,
  stops on error, never uploads or schedules a future run.
- Existing SHA-256 duplicate ingest refuses a redundant source. A duplicate
  in another project stays in its original collection until a user explicitly
  moves it using the existing safe UI. No silent copying or cross-project
  publication; existing local original-file boundaries unchanged.
- Help and tests cover source review permissions, metadata preservation,
  bounded manual queue and multi-project status isolation.

## Windows operator acceptance

1. Open the GitHub `main` push run for this build; verify all five workflow
   lanes GREEN. GitHub production promotion doesn't update a Windows service.
2. Save/download corrected `scripts/update-rosevear-ai-hub.ps1`; **execute the
   saved file, do not paste its contents at the `PS>` prompt**. It discovers
   the repository either from the file's parent `scripts` folder or the
   current repository working directory if `PSScriptRoot` is unset.
3. From `C:\Users\Ree\rosevearaihub` run
   `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update-rosevear-ai-hub.ps1`.
   Reuse the separate restart script after the updater finishes.
4. Build 055 makes **no database migration**. If Build 054 migration `0017`
   was not yet applied, back up the database, temporarily disable recovery
   scheduling and stop the known Hub API; then rerun with `-ApplyMigrations`.
   Never disable automatic recovery permanently or kill unrelated processes.
5. Confirm the local `/version` returns `0.0.55`. Create two project
   collections, add documents, verify duplicate detection and searchable
   citations are scoped to the selected project.
6. Owner/Admin review a source and reload. Verify note persists and a
   read-only user cannot retrieve or change the note. Test queue with one
   source while Ollama works, and failure/empty state when unavailable.

## Security and rollback

There are no new external services, network listeners, cross-project remote
writes, autonomous ingest or migrations. Reviews reside in the same encrypted
backup boundary as existing source metadata. Roll back code to last verified
main only with operator approval and retain the metadata. The separate Windows
server state, Tailscale, Caddy, cameras and restored-backup acceptance are not
proven by GitHub CI.
