# Captured B itinerary regression

`accepted-repair.openui` is the exact accepted user scene (5,409 source characters, excluding its final newline), artifact revision5. `failed-part.json` is the captured terminal failed tool with empty input. The rejected source was not retained by the original server and cannot be diagnosed retroactively.

`captured-context.json` preserves root's pre-reload artifact state and compact manifests. `replay-result.json` records an isolated native history restore using that exact source, failed/accepted parts, the real Python fare API, and browser query workers. The reconstructed initial user prompt is identified in the harness. The test intentionally seeds descending host sort, then verifies it wins over the scene's ascending default. The actual user session is untouched.

The replay passes: stable refs, three empty per-leg query results, three comparison tables with useful empty statuses, a useful empty fare picker, no failed-tool spinner, and preserved highest-price sort. The first multi-route resource refreshed to268 rows versus23 in the earlier capture; both counts concern the aggregate, while each requested train/bus date and leg has zero results. The captured count remains unchanged in its fixture.

`backend-availability.json` independently shows Barcelona–Prague has no demo route, and both Paris–Prague directions offer flights only on the requested dates. Requested train/bus coverage does not establish availability.

`followup-http400-diagnostic.json` retains the first isolated follow-up failure before model dispatch. The current request parser accepts its exact request. This attempt does not prove live model authorship or a successful follow-up. The server environment is being checked separately.

Run `node verification/generative-ui/b/user-itinerary/replay-and-followup.mjs` against the owned preview at5194. It uses an isolated browser context and performs one genuine model follow-up after replay verification.
