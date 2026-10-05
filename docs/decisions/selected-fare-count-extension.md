# Selected fare count catalog extension

This decision records the `SelectedFareCount` extension for the task "show how many fares I have selected while I compare or rearrange the trip".

## Contract and ownership

`SelectedFareCount` is a granular shared view. It subscribes to the artifact identified by the existing bounded scalar `artifactRef` and derives `selectedFareIds.length`. It renders "0 selected fares", "1 selected fare" or the corresponding plural in a polite, atomic status region. It does not count legs, validate itinerary completeness, claim a price, or load fare facts. A selection count remains usable without an available fare resource. An unresolved artifact uses the existing catalog reference fallback.

The component accepts the existing shared scalar prop schema. There is no model-supplied count, row collection, selector expression, new query operator, tool or state key. The native renderer subscribes to host selection actions.

The integration orchestrator approved this narrow proposal before implementation. The runtime integration owner reviews the diff and the catalog compatibility contract before integration. Individual review findings and acceptance are reported with the PR rather than claimed here in advance.

## Generator and compatibility

The canonical descriptor is appended to the catalog. The generator emits the native compiler-valid `"use generative"` toolkit alongside generated schemas and model documentation. Inline `render` positions remain compatible with the assistant-ui Vite compiler. Check mode compares the generated outputs, so omitting or hand-editing an entry fails catalog verification.

Catalog version remains `1.0.0` because this is an additive compatible component. Existing component names, scalar schemas and B positional argument order remain intact. The manifest hash changes to identify the expanded vocabulary. Persistence checks catalog/parser/query versions rather than requiring the historical catalog hash; no stored source, message, selection or artifact ID is migrated or reset. The current saved browser conversations require final integration-origin reload verification, which remains the integration owner's gate.

Native example:

```json
{"$type":"TravelSurface","artifactRef":"trip","children":[{"$type":"FarePicker","artifactRef":"trip"},{"$type":"SelectedFareCount","artifactRef":"trip"}]}
```

## Cost and boundary proof

Runtime work is one host-store subscription and one array-length read per revision, with no worker query, lookup, network request or model turn. No dependency was added. The extension build's generative route is 882.36 kB versus the recorded 881.40 kB baseline, approximately 0.96 kB more before gzip and 0.21 kB more after gzip. This includes synchronized descriptor descriptions, so it is an observed bundle delta rather than an isolated widget allocation.

`selected-fare-count.test.tsx` exercises native tree validation with shared view rendering. The tests prove zero, singular, plural and deselection updates, independent artifacts, no query or lookup calls, rejection of copied data and unknown props, and invalid-reference fallback.

The browser proof selects and deselects an actual fixture fare through FarePicker at 360px. The native renderer receives real tool-input deltas, accepts an edit before stream completion, and preserves the count afterward.

Verified commands on 2026-10-03: focused four tests; full 112 Vitest tests across 30 files; eight Python backend tests; strict TypeScript; catalog generation followed by byte-exact check; production build; deterministic actual-adapter Chrome 154 browser proof. The existing Vite large-chunk advisory remains. Canonical graph refresh is owned by the final integration writer after source freeze.
