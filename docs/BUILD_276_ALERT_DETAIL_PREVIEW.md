# Build 276 — Alert Detail Preview, Source Context & Safe Return to Home

## User experience

The pinned Home activity panel now lets an operator **Preview details** for any visible follow-up without leaving Home. One preview is shown at a time, with the priority, known condition, bounded source context and a reminder that the preview is not an acknowledgement or independent verification.

- Real local inbox notifications may show their notification number, recorded timestamp, validated source category and bounded message, **only if the current account may open Notifications**. Raw `source_id`, creator IDs, URLs and unbounded text are never shown in the Home preview.
- Hub backend, Ollama and unavailable-history follow-ups are labelled **current observations**, not historical events; no event ID or timestamp is invented.
- Invalid event timestamps, unsafe source-category strings and oversized/control-character messages are suppressed with explicit unknown/unavailable states.
- **Return to Home alerts** closes the preview, restoring focus to its originating button. Filter changes and explicit refresh close stale details rather than suggesting a hidden or obsolete alert is still selected.
- A separate source-screen button appears only when the current account has that exact permitted route. If opened, the existing **Workspace history → Return to Home workspace** control navigates back to Home without replaying any action.

The Home panel continues to display full sampled notification counts regardless of filter or preview selection, and remains pinned outside optional Home widgets.

## Safe scope

- The preview uses the existing authenticated local inbox GET and current health props. It makes **no additional requests** when opening, closing or filtering.
- It never acknowledges, dismisses, sends, repairs, enables a relay, changes an owner decision or changes source trust. Comms attachment stays **HOLD** and private relay **OFF**.
- Record details are withheld from accounts without the Notifications workspace, even if their Home summary already shows a generic alert title.
- A timestamp or source-category field is reported context, not proof of authenticity, custody, device status or a successful field test.

## Verification and release gates

Unit tests cover bounded source metadata, current-observation labels and restricted data. Component tests cover keyboard focus restoration, safe filter/refresh invalidation, permission-safe preview and unchanged reads. App integration covers source navigation and the existing safe Home return control. Complete web regression and production TypeScript/build verification are required.

Promote only through the protected source branch → `dev` → `main` flow, with independent `main` push checks green. GitHub promotion **does not install** the updated client on Ree's Windows mini-server.
