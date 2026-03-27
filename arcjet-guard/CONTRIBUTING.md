# Contributing to @arcjet/guard

## Prerequisites

- Node.js >= 22.18.0
- npm

## Install dependencies

```sh
npm ci
```

## Commands

### Build

Bundles source with rolldown and emits `.d.ts` declarations with tsc:

```sh
npm run build
```

### Type check

```sh
npm run typecheck
```

### Lint

Runs both syntax-level and type-aware rules (powered by `oxlint-tsgolint`):

```sh
npx oxlint
```

### Format

Check formatting:

```sh
npx oxfmt --check src/ test/
```

Fix formatting:

```sh
npx oxfmt src/ test/
```

### Test

Unit tests (no build required):

```sh
npm run test-unit
```

Runtime smoke tests (build first):

```sh
npm run test-runtime-node       # Node.js HTTP/2
npm run test-runtime-fetch      # Fetch HTTP/1.1
npm run test-runtime-cloudflare # Cloudflare Workers via miniflare
npm run test-runtime            # All runtime tests
```

All tests + lint:

```sh
npm test
```

### Full static analysis + tests

```sh
npx tsc --noEmit && npx oxlint && npx oxfmt --check src/ test/ && npm run build && node --test src/guard.test.ts src/client.test.ts test/runtime/node.test.ts test/runtime/fetch.test.ts test/runtime/cloudflare/cloudflare.test.ts
```

## Notes

- Tests run from `.ts` source
- Linting uses type-aware rules via `oxlint-tsgolint` (powered by
  `typescript-go`). The `typeAware` option in `.oxlintrc.json` enables rules
  like `no-floating-promises` and `strict-boolean-expressions` that require
  type information.
- Runtime smoke tests require `npm run build` first — they import from the
  published `dist/` output via package exports.
- The Cloudflare Worker test bundles a thin worker in-memory with rolldown and
  runs it via miniflare against a real mock server.

DO NOT UNDER ANY CIRCUMSTANCES ADD RANDOM COMMENTS WITH --- or === in the source files. Looking at you claude.
