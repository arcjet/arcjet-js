<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Block Sensitive Info with Next.js using the App Router

This example shows how to use Arcjet with a Next.js [route
handler](https://nextjs.org/docs/app/building-your-application/routing/route-handlers).

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-sensitive-info
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Curl `http://localhost:3000/api/arcjet` with some data
   `curl http://localhost:3000/api/arcjet -H "Content-Type: text/plain" -X POST --data "my email is test@example.com"`
   `curl http://localhost:3000/api/arcjet -H "Content-Type: text/plain" -X POST --data "here's a string that contains-a-dash"`
6. If the data you sent contains any blocked types then the route will return a 400.

## On-device model backend (Rampart)

The `/api/arcjet-rampart` route uses the same `sensitiveInfo` rule but swaps the
default WebAssembly engine for the
[`@arcjet/sensitive-info-rampart`](../../sensitive-info-rampart) backend, which
runs an on-device NER model. This detects names, addresses, and
government/financial identifiers — not just the four built-in types — while
still running entirely locally.

```bash
curl http://localhost:3000/api/arcjet-rampart -H "Content-Type: text/plain" -X POST --data "Hi, my name is Alex Rivera and my SSN is 472-81-0094"
```

This returns a 400 with the detected `GIVEN_NAME`, `SURNAME`, and `SSN` entities
because the request contains a name and an SSN. The model is loaded once on the
first request (a few hundred milliseconds) and reused after that.

> [!NOTE]
> When testing locally with `curl`, set `ARCJET_ENV=development` (e.g. in
> `.env.local`) so Arcjet doesn't require a public client IP for the request
> fingerprint.

### Configuring Next.js for the Rampart backend

The Rampart backend loads a native ONNX runtime (`@huggingface/transformers` /
`onnxruntime-node`) and reads its bundled model weights from disk at runtime. If
Next.js tries to bundle these into the server build, the native binary and the
model files won't resolve. Mark them as
[server external packages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
so Next.js loads them from `node_modules` at runtime instead:

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

Any route handler that uses the backend must also run on the Node.js runtime
(the default for route handlers) rather than the Edge runtime, since the native
addon is not available on Edge:

```ts
// app/api/arcjet-rampart/route.ts
export const runtime = "nodejs";
```
