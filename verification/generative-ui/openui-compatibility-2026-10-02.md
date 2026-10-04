# Published OpenUI runtime compatibility

Verified 2026-10-02 on base `dc14f22`, Node 22.16.0, npm 10.9.2, macOS, React 19.2.0. Exact packages used: `@openuidev/react-lang` 0.3.0, `@openuidev/lang-core` 0.3.0, Zod 4.3.6, Vitest 4.0.18, jsdom 28.0.0, Testing Library React 16.3.2 and user-event 14.6.1, TypeScript 5.9.3. Packages were installed in an isolated temporary directory. The integration owner owns repository package and lock changes.

## Verified public interfaces

Six tests in `tests/compatibility/openui-runtime.test.tsx` exercise the installed package, not a replacement renderer:

- `createParser(library.toJSONSchema(), library.root)` parses Lang v0.5 variables, query dependencies, and ordered actions. `createStreamingParser` exposes incomplete chunks and unknown-component errors.
- `useStateField` edits re-evaluate dependent local queries. `onStateUpdate` includes `$variable` edits, `@Set`, and `@Reset`.
- `Mutation` with ordered `@Run`, `@Set`, and toggle actions produces the selected-fare state in the host callback.
- A query result containing a unique fare sentinel remains absent from raw state updates.
- Queries defer while `isStreaming` is true. The registered test control remains usable, and its newer value survives the completed source patch.
- Hydration and patched source use the latest compact state through `HostStateRenderer`. This wrapper is a spike, restricted to explicitly allowed scalar keys.

The tests exposed a real integration risk. Passing request-captured `initialState` again when source changes overwrites newer edits. Published core `Store.initialize` reapplies persisted keys. The wrapper tracks each allowlisted state update and hydrates the next source revision from that current state. Query outputs never pass through its state projector.

The first local query can execute twice during initial store setup. Resource coalescing, query caching, and revision checks belong in the shared data bridge. Test assertions check actual interaction transitions rather than promising one initial provider invocation.

## Commands and outcomes

```sh
./node_modules/.bin/vitest run --config tests/compatibility/vitest.config.ts
./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --jsx react-jsx \
  --module esnext --moduleResolution bundler --target es2022 --lib es2022,dom \
  --types vitest/globals,node tests/compatibility/openui-runtime.test.tsx \
  spikes/openui/host-state-renderer.tsx tests/compatibility/vitest.config.ts
```

Six tests passed, one file, approximately 1.16 seconds. Strict typechecking passed. jsdom establishes protocol and component behavior; it is not a browser performance or accessibility measurement.

## Continuation and outstanding gates

The current [OpenUI assistant-ui reference](https://www.openui.com/docs/api-reference/assistant-ui) confirms that stock `present_openui` completes as a final display; the optional continuation helper covers human-input `prompt_openui`. Version B must mount direct `Renderer` in the custom `compose_reactive_scene` Tool UI and return only artifact ID, revision, and status. The shared AI SDK transport must prove ordered text, program artifact, browser result, continued text, and a second program. That end-to-end continuation proof remains pending integration. No live-model gate is claimed here.

The [react-lang reference](https://www.openui.com/docs/api-reference/react-lang) and [reactive state guide](https://www.openui.com/docs/openui-lang/reactive-state) describe the public hooks and language. Current documentation was fetched through Context7 using `/thesysdev/openui`; published declarations and runtime were inspected separately. Application grammar limits, row-safe tool result/error projections, whole-message persistence inspection, renderer-local query caps, browser traces, and withheld live authorship tasks remain later gates.
