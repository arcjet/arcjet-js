/**
 * Runtime smoke test: Fetch (connect-web) transport.
 *
 * Starts a real HTTP/1.1 server with the mock DecideService, then
 * calls `launchArcjet()` from the `@arcjet/guard/fetch` entrypoint
 * to verify the fetch-based transport works end-to-end.
 *
 * ## HTTP/2 and fetch across runtimes
 *
 * **Node (undici):** `fetch` does NOT negotiate HTTP/2 via ALPN — it
 * always uses HTTP/1.1, even over TLS. The `allowH2` option exists in
 * undici but still defaults to `false` as of Node 22. The Node.js collab
 * summit voted (Apr 2025) to enable it by default in Node 25, but it has
 * not shipped yet. See {@link https://github.com/nodejs/undici/issues/2750}.
 * The Node HTTP/2 transport is tested separately in node.test.ts using
 * `@connectrpc/connect-node` with both cleartext h2c and self-signed HTTPS.
 *
 * **Deno:** `fetch` advertises both `h2` and `http/1.1` in the ALPN
 * extension during the TLS handshake, so it negotiates HTTP/2 transparently
 * when the server supports it. See deno.test.ts.
 *
 * **Bun:** `node:http2` is implemented (95% of gRPC tests pass), but
 * `fetch` does NOT support HTTP/2 yet — it is an open feature request.
 * See {@link https://github.com/oven-sh/bun/issues/7194}. Until that
 * ships, Bun users must use `@connectrpc/connect-node` (node:http2)
 * rather than the fetch transport for HTTP/2 servers. See bun.test.ts.
 */

import assert from "node:assert/strict";
import { describe, test, before, after } from "node:test";

import {
  launchArcjet,
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
} from "@arcjet/guard/fetch";

import { cases } from "../_shared/cases.ts";
import type { GuardSurface } from "../_shared/cases.ts";
import { startHttpServer } from "../_shared/mock-server.ts";

const surface: GuardSurface = {
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
};

describe("In-memory shared cases (Fetch entrypoint)", () => {
  for (const tc of cases) {
    test(tc.name, () => tc.run(surface));
  }
});

describe("Runtime: Fetch (connect-web) transport", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ baseUrl, close } = await startHttpServer());
  });

  after(async () => {
    await close();
  });

  test("token bucket ALLOW over real HTTP/1.1 fetch", async () => {
    const arcjet = launchArcjet({ key: "ajkey_dummy", baseUrl });
    const limit = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
    const input = limit({ key: "user_1" });

    const decision = await arcjet.guard({
      label: "test.fetch",
      rules: [input],
    });

    assert.equal(decision.conclusion, "ALLOW");
    assert.equal(decision.hasError(), false);

    const result = input.result(decision);
    assert.ok(result);
    assert.equal(result.remainingTokens, 95);
  });
});
