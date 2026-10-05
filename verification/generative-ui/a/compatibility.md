# Native A compatibility evidence

Recorded on 2026-10-02, base `d7fa98e`, macOS, Node 24.7.0, Chrome 154.0.8037.97.

The backendless assistant-ui compiler builds the trusted `use generative` toolkit with inline render entries. The browser renders the native recursive `present` tree between the original message text parts. Browser text was "Before the view", "Travel choices", "Train option", "Bus option", "After the view", in that order. No page errors occurred. `native-present.png` records this fixture.

The fixture contains a deterministic initial transcript. It proves the renderer and ordered message placement. It does not count as live model authorship or tool continuation.

The real `AssistantChatTransport` tests prove request identity and uploaded system/tool/config fields survive the custom snapshot transform. Two actual sends capture separate current snapshots, including retry. Snapshot values pass shared schema, reference, byte, and leakage validation before transport.

Resolved packages are `@assistant-ui/react` 0.15.23, `@assistant-ui/ai-sdk` 0.0.9, `@assistant-ui/vite` 0.0.19, `@assistant-ui/react-generative-ui` 0.0.22, `ai` 7.0.127, `@ai-sdk/react` 4.0.130, and Zod 4.6.5. Vitest resolved 4.1.11 in the shared foundation.

## Observed API boundaries

- `aui({ backendless: true })` runs before the React plugin.
- `AuiConfig({ tools: Tools({ toolkit }) })` registers the toolkit on `AssistantRuntimeProvider`.
- Native tree nodes use `$type` and optional `$key`, scalar component props, and recursive `children`.
- `present.execute` returns `{}`. It does not echo fare rows or generated props.
- The generated native schema merges component properties into an optional root property bag. Component schemas must align shared property types. The native renderer does not validate complete props or trees, so host validation is required before stateful component mounting.
- Unknown component names render nothing. Host raw-tree validation must report them before this information disappears.
- Components without `streamProperties` wait until completion. Streaming layouts receive `$status` and partial props.
- AI SDK v7 Node streaming uses standalone `pipeUIMessageStreamToResponse` and `toUIMessageStream({ stream: result.stream })`.

## Provider probe

The existing Google key returned sanitized HTTP 400 `INVALID_ARGUMENT`, reason `API_KEY_INVALID`. No credential value entered output.

The signed-in Codex CLI 0.159.0-alpha.12.1 returned the strict JSON object `{"status":"READY"}` with model `gpt-6.1-sol`, using the user's existing ChatGPT authentication. The process ran in a temporary directory, read-only, ephemeral, with user config/rules ignored, web search disabled, and shell, code-mode host, plugins, apps, delegation, and hooks disabled. Its events contained no command or tool execution. A code-mode-unavailable warning motivates also disabling `code_mode`. The finalized agent-message event proves live inference, but does not establish token-delta streaming. The server owner must verify a stream-capable isolated adapter.

Official sources were read through Context7 and [Codex non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode). Current docs take precedence over the earlier plan's failed Context7 observations.

## Commands

```sh
npm run typecheck
node_modules/.bin/vitest run src/generative/chat/transport.test.ts --environment node
node_modules/.bin/vite build --config verification/generative-ui/a/spike/vite.config.ts
node_modules/.bin/vite --config verification/generative-ui/a/spike/vite.config.ts --host 127.0.0.1 --port 5181
```

Playwright used installed Chrome with `chromium.launch({ headless: true, channel: 'chrome' })`. The default downloaded Chromium executable was absent.

## Shared catalog and paused-stream proof

The repeatable `run-browser-proof.mjs` exercises three different recursive arrangements through native present tool argument deltas. Five cases cover desktop and 360px blue/sand themes, keyboard mode filtering before the closing root arrives, ordered text/UI/text, continuation, a fresh next-request snapshot, and preserved focus and host revision after completion. The recorded results identify these fixtures as deterministic runtime evidence, not live model authorship.

`toolkit-client.tsx` retains the native present schema, identity, and empty execution result. Its display boundary prunes incomplete or invalid children independently, validates registered scalar props and existing refs, and applies the shared 80-node and eight-level limits before calling the native renderer. Final oversized or invalid trees show a stable error instead of silently truncating. The original compiler-owned toolkit remains unchanged.
