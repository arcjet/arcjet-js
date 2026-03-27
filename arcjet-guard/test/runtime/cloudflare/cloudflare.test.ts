/**
 * Runtime smoke test: Cloudflare Workers via miniflare.
 *
 * 1. Starts a real HTTP/1.1 mock DecideService server on localhost
 * 2. Bundles the Worker in memory with rolldown
 * 3. Starts miniflare with the server URL as a binding
 * 4. The Worker calls the real server through the fetch transport
 * 5. Assertions run here in Node, not inside the Worker
 *
 * Uses HTTP/1.1 because Workers' fetch() doesn't control outbound HTTP
 * version — Cloudflare's edge negotiates the protocol transparently.
 */

import assert from "node:assert/strict";
import { describe, test, before, after } from "node:test";

import { Miniflare } from "miniflare";
import { rolldown } from "rolldown";

import { startHttpServer } from "../../_shared/mock-server.ts";

const WORKER_ENTRY = "test/runtime/cloudflare/worker.ts";

describe("Runtime: Cloudflare Workers (miniflare)", () => {
  let mf: Miniflare;
  let closeServer: () => Promise<void>;

  before(async () => {
    // Start a real mock server the Worker will call
    const server = await startHttpServer();
    closeServer = server.close;

    // Bundle the Worker in memory
    const build = await rolldown({
      input: WORKER_ENTRY,
      platform: "neutral",
      resolve: { extensions: [".ts", ".js", ".json"] },
      external: [],
    });
    const { output } = await build.generate({ format: "esm" });
    await build.close();

    mf = new Miniflare({
      script: output[0].code,
      modules: true,
      modulesRules: [{ type: "ESModule", include: ["**/*.js"] }],
      compatibilityDate: "2025-09-01",
      bindings: { ARCJET_BASE_URL: server.baseUrl },
    });
    await mf.ready;
  });

  after(async () => {
    if (mf !== undefined) await mf.dispose();
    if (closeServer !== undefined) await closeServer();
  });

  test("token bucket ALLOW through real server from Workers", async () => {
    const response = await mf.dispatchFetch("http://localhost/");
    assert.equal(response.ok, true, `Worker responded ${response.status}`);

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- response.json() returns unknown
    const json = (await response.json()) as {
      conclusion: string;
      hasError: boolean;
      remainingTokens: number | null;
      error?: string;
    };

    assert.equal(json.conclusion, "ALLOW");
    assert.equal(json.hasError, false);
    assert.equal(json.remainingTokens, 95);
  });
});
