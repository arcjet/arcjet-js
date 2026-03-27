# Contributing to `@arcjet/guard`

## Prerequisites

- Node.js >= 22.18.0
- npm

Optional for runtime tests:

- [Bun](https://bun.sh/) >= 1
- [Deno](https://deno.land/) >= stable / lts

## Install dependencies

```sh
npm ci
```

## Commands

### Build

Bundles source with [rolldown](https://rolldown.rs) and emits `.d.ts`
declarations via `rolldown-plugin-dts`:

```sh
npm run build
```

### Type check

Uses [`tsgo`](https://github.com/nicolo-ribaudo/typescript-go-nightly)
(TypeScript native preview):

```sh
npm run typecheck
```

### Lint

Uses [oxlint](https://oxc.rs/docs/guide/usage/linter) with type-aware rules
powered by `oxlint-tsgolint`:

```sh
npm run lint
```

### Format

Check formatting with [oxfmt](https://oxc.rs/docs/guide/usage/formatter):

```sh
npm run format:check
```

Fix formatting:

```sh
npm run format
```

### Test

Unit tests (no build required — runs from `.ts` source via Node's built-in
type stripping):

```sh
npm run test-unit
```

Runtime tests (build first — imports from `dist/` via package exports):

```sh
npm run test-runtime-node       # Node.js HTTP/2 + HTTPS
npm run test-runtime-fetch      # Fetch HTTP/1.1 (connect-web)
npm run test-runtime-bun        # Bun HTTP/2 over TLS
npm run test-runtime-deno       # Deno fetch + ALPN over TLS
npm run test-runtime-cloudflare # Cloudflare Workers via miniflare
npm run test-runtime            # Node + Fetch + Cloudflare
```

All checks (build + lint + unit tests):

```sh
npm test
```

## Architecture notes

- **No generics in public types.** Each rule kind gets its own concrete
  discriminated union types (`RuleWithConfigTokenBucket`,
  `RuleWithInputTokenBucket`, etc.) for straightforward narrowing.
- **Two entrypoints.** `./node` uses HTTP/2 via `@connectrpc/connect-node`;
  `./fetch` uses the Fetch API via `@connectrpc/connect-web`. The root export
  branches via conditional exports.
- **Local WASM detection.** Sensitive info detection runs locally via
  `@arcjet/analyze` before sending results to the server.
- **Shared test cases.** The 19 shared test cases in `test/_shared/cases.ts`
  are run by every runtime (Node, Fetch, Bun, Deno, Cloudflare Workers).
  Runtime-agnostic mock handlers live in `test/_shared/mock-handlers.ts`;
  Node-specific servers live in `test/_shared/mock-server.ts`.
- **Deno `--no-check`.** Deno's type checker cannot resolve
  `@bufbuild/protobuf` v2 generics (it collapses `MessageInit<T>` to
  `MessageInit<Message>`). This only affects the test helpers — published
  `.d.ts` files have fully resolved types.
