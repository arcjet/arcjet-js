/**
 * Runtime test: core `arcjet` SDK `protect()` on Cloudflare Workers via
 * miniflare.
 *
 * 1. Starts a real HTTP/1.1 mock DecideService server on localhost
 * 2. Bundles the Worker in memory with rolldown, resolving the `workerd`
 *    export conditions (so `@arcjet/transport` and `@arcjet/analyze-wasm`
 *    pick their `workerd` entries)
 * 3. Supplies the local-fingerprinting WASM as `CompiledWasm` modules — the
 *    same module shape wrangler produces from the `.wasm` imports on a real
 *    deploy
 * 4. Starts miniflare and dispatches a request, which runs `protect()` inside
 *    the Worker against the real mock server
 * 5. Assertions run here in Node from the Worker's JSON response
 *
 * Uses HTTP/1.1 because Workers' `fetch()` doesn't control the outbound HTTP
 * version — Cloudflare's edge negotiates the protocol transparently.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test, before, after } from "node:test";

import { Miniflare } from "miniflare";
import { rolldown } from "rolldown";
import type { Plugin } from "rolldown";

import { startHttpServer, getDecideCalls, getLastDecideRequest } from "./mock-server.ts";

const WORKER_ENTRY = new URL("./worker.ts", import.meta.url).pathname;
const WASM_DIR = new URL("../../../../analyze-wasm/wasm/", import.meta.url).pathname;

describe("Runtime: core arcjet protect() on Cloudflare Workers (miniflare)", () => {
  let mf: Miniflare;
  let closeServer: () => Promise<void>;

  before(async () => {
    // Start a real mock server the Worker will call
    const server = await startHttpServer();
    closeServer = server.close;

    // Keep the `.wasm` imports external under a bare basename so the bundle
    // emits `import x from "<name>.wasm"`, which miniflare resolves to a
    // `CompiledWasm` module we supply alongside the worker (mirroring wrangler).
    const wasmBasenames = new Set<string>();
    const wasmExternalPlugin: Plugin = {
      name: "wasm-external",
      resolveId(id) {
        if (id.includes(".wasm")) {
          const clean = id.replace(/\?.*$/, "");
          const base = clean.slice(clean.lastIndexOf("/") + 1);
          wasmBasenames.add(base);
          return { id: base, external: true };
        }
        return null;
      },
    };

    // Bundle the Worker in memory
    const build = await rolldown({
      input: WORKER_ENTRY,
      platform: "neutral",
      plugins: [wasmExternalPlugin],
      resolve: {
        extensions: [".ts", ".js", ".json"],
        conditionNames: ["workerd", "browser", "import", "default"],
      },
    });
    const { output } = await build.generate({ format: "esm" });
    await build.close();

    const modules = [
      {
        type: "ESModule" as const,
        path: "worker.js",
        contents: output[0].code,
      },
      ...[...wasmBasenames].map((base) => ({
        type: "CompiledWasm" as const,
        path: base,
        contents: readFileSync(WASM_DIR + base),
      })),
    ];

    mf = new Miniflare({
      modules,
      modulesRoot: "",
      compatibilityDate: "2025-09-01",
      compatibilityFlags: ["nodejs_compat"],
      bindings: { ARCJET_BASE_URL: server.baseUrl },
    });
    await mf.ready;
  });

  after(async () => {
    if (mf !== undefined) await mf.dispose();
    if (closeServer !== undefined) await closeServer();
  });

  test("protect() returns ALLOW through real server from Workers", async () => {
    const response = await mf.dispatchFetch("http://localhost/");

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- response.json() returns unknown
    const json = (await response.json()) as {
      conclusion?: string;
      isErrored?: boolean;
      error?: string;
      stack?: string;
    };

    if (!response.ok) {
      console.error(`  Worker error: ${json.error}\n${json.stack ?? ""}`);
    }

    assert.equal(response.ok, true, `Worker responded ${response.status}`);
    assert.equal(json.conclusion, "ALLOW");
    assert.equal(json.isErrored, false);

    // Prove the request actually left the Worker via the workerd transport and
    // reached the DecideService over the network (not a local short-circuit).
    assert.equal(getDecideCalls(), 1, "expected exactly one decide() call");
    const decideRequest = getLastDecideRequest();
    assert.ok(decideRequest !== null);
    assert.equal(decideRequest.sdkVersion, "test");
    assert.equal(decideRequest.ruleCount, 1, "expected the token bucket rule to be sent");
  });
});
