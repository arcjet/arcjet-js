<a href="https://nosecone.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@nosecone/sveltekit`

<p>
  <a href="https://www.npmjs.com/package/@nosecone/sveltekit">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40nosecone%2Fsveltekit?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40nosecone%2Fsveltekit?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

Protect your SvelteKit application with secure headers.

- [npm package (`@nosecone/sveltekit`)](https://www.npmjs.com/package/@nosecone/sveltekit)
- [GitHub source code (`nosecone-sveltekit/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/nosecone-sveltekit)

## Installation

```shell
npm install -S @nosecone/sveltekit
```

## Example

Update your `svelte.config.js` file for `csp`:

```diff
import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
+ import { csp } from "@nosecone/sveltekit"

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
+   csp: csp(),
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
  },
};

export default config;
```

Create a `src/hooks.server.ts` file with the contents:

```ts
import { createHook } from "@nosecone/sveltekit";
import { sequence } from "@sveltejs/kit/hooks";

export const handle = sequence(
  createHook(),
  // ... other hooks can go here
);
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
