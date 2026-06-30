<!-- trunk-ignore-all(markdownlint/MD001) -->

<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/sensitive-info-rampart`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/sensitive-info-rampart">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fsensitive-info-rampart?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fsensitive-info-rampart?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This package is an alternative **detection backend** for Arcjet's
[sensitive information][sensitive-info] rule. It runs the on-device
[Rampart][rampart] named-entity-recognition model — a ~15&nbsp;MB quantized ONNX
model — so the rule can detect names, addresses, and government/financial
identifiers in addition to the four types the default WebAssembly engine
detects. Everything runs locally (Node.js, Bun, or Deno); no data leaves your
environment, and the model weights are bundled so nothing is fetched at runtime.

## Installation

```shell
npm install @arcjet/sensitive-info-rampart
```

## Usage

Pass the backend to the `sensitiveInfo` rule. The rest of the rule — `mode`,
`allow`/`deny`, and the result shape — is unchanged.

```ts
import arcjet, { sensitiveInfo } from "@arcjet/node";
import { rampart } from "@arcjet/sensitive-info-rampart";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    sensitiveInfo({
      mode: "LIVE",
      // Every Rampart entity is a built-in type — no generic needed.
      deny: ["EMAIL", "GIVEN_NAME", "SURNAME", "STREET_NAME", "SSN"],
      backend: rampart(),
    }),
  ],
});

const decision = await aj.protect(req, {
  sensitiveInfoValue: "My name is Alex Rivera and my SSN is 472-81-0094.",
});
```

Without a `backend`, the rule continues to use the default WebAssembly engine —
this package is entirely opt-in.

## Detected entities

The model detects: `GIVEN_NAME`, `SURNAME`, `EMAIL`, `PHONE_NUMBER`, `URL`,
`TAX_ID`, `BANK_ACCOUNT`, `ROUTING_NUMBER`, `GOVERNMENT_ID`, `PASSPORT`,
`DRIVERS_LICENSE`, `BUILDING_NUMBER`, `STREET_NAME`, `SECONDARY_ADDRESS`,
`CITY`, `STATE`, and `ZIP_CODE`.

Deterministic recognizers additionally detect the structured, validatable types
`EMAIL`, `URL`, `IP_ADDRESS`, `PHONE_NUMBER`, `SSN`, and `CREDIT_CARD_NUMBER`
(Luhn-validated), mirroring Rampart's deterministic redaction layer. On
overlapping text the recognizer result wins over the model.

The full set is exported as `rampartEntities`:

```ts
import { rampart, rampartEntities } from "@arcjet/sensitive-info-rampart";

sensitiveInfo({ deny: rampartEntities, backend: rampart() });
```

## Options

```ts
rampart({
  // Run a GPU instead of CPU when the runtime supports it.
  device: "webgpu",
  // Minimum confidence for a model token to count (default: 0.5).
  threshold: 0.6,
  // Add or replace the deterministic recognizers. This is the extension point
  // for custom detection with this backend.
  recognizers: [
    ...defaultRecognizers,
    (value) => /* DetectedSpan[] */,
  ],
});
```

The model loads once on first use and is reused for every request. The
token-based `detect` callback of the `sensitiveInfo` rule is not used by this
backend; add a recognizer instead.

> [!NOTE]
> Inference runs in the request path, so its latency affects request handling.
> The model performs best on Latin-script text; see the [model card][rampart]
> for accuracy and language details.

## Bundlers and frameworks

This package loads a native ONNX runtime (`@huggingface/transformers` /
`onnxruntime-node`) and reads its bundled model weights from disk at runtime, so
it must not be bundled by a server build. It also requires a server runtime with
filesystem and native-addon access (Node.js, Bun, or Deno) — it does not run on
edge runtimes.

### Next.js

Mark the package (and its native dependencies) as
[server external packages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
so Next.js loads them from `node_modules` at runtime instead of bundling them:

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@arcjet/sensitive-info-rampart",
    "@huggingface/transformers",
    "onnxruntime-node",
  ],
};

module.exports = nextConfig;
```

Any route handler that uses the backend must run on the Node.js runtime (the
default for route handlers), not the Edge runtime:

```ts
// app/api/protect/route.ts
export const runtime = "nodejs";
```

## License

The source code of this package is licensed under the
[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

### Bundled model

This package bundles the [Rampart][rampart] model and its tokenizer/configuration
files (under `models/rampart/`), which are a separate work:

> "Rampart: Client-side PII redaction for AI assistants" by
> [National Design Studio][rampart], Copyright 2026 National Design Studio,
> licensed under [CC BY 4.0][cc-by-4]. The files are redistributed unmodified.

The full model license is in [`models/rampart/LICENSE`](./models/rampart/LICENSE)
and the attribution is recorded in [`NOTICE`](./NOTICE). If you redistribute this
package or the model files, retain that attribution as required by CC BY 4.0.

```bibtex
@misc{rampart-2026,
  author = {National Design Studio},
  title  = {Rampart: Client-side PII redaction for AI assistants},
  year   = {2026},
  url    = {https://huggingface.co/nationaldesignstudio/rampart},
}
```

[arcjet]: https://arcjet.com
[sensitive-info]: https://docs.arcjet.com/sensitive-info
[rampart]: https://huggingface.co/nationaldesignstudio/rampart
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[cc-by-4]: https://creativecommons.org/licenses/by/4.0/
