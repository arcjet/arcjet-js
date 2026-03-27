/**
 * Runtime smoke test: Bun — connect-node transport with HTTP/2 over TLS.
 *
 * Bun's `fetch` does not support HTTP/2 (https://github.com/oven-sh/bun/issues/7194),
 * but `node:http2` works well (95% of gRPC tests pass). The `"bun"` export
 * condition in package.json resolves to the `node` entrypoint which uses
 * `@connectrpc/connect-node` and `node:http2` directly.
 *
 * This test validates that path end-to-end against a self-signed HTTPS
 * HTTP/2 server using Bun's native test runner.
 *
 * Run: bun test test/runtime/bun.test.ts
 */

import { describe, test, beforeAll, afterAll, expect } from "bun:test";

import { launchArcjetWithTransport, tokenBucket } from "@arcjet/guard";
import { createConnectTransport, Http2SessionManager } from "@connectrpc/connect-node";

import { startH2SecureServer } from "../_shared/mock-server.ts";

describe("Bun: connect-node HTTP/2 over TLS (self-signed)", () => {
  let baseUrl: string;
  let ca: string;
  let closeServer: () => Promise<void>;
  let sessionManager: Http2SessionManager;

  beforeAll(async () => {
    ({ baseUrl, ca, close: closeServer } = await startH2SecureServer());
  });

  afterAll(async () => {
    if (sessionManager !== undefined) sessionManager.abort();
    if (closeServer !== undefined) await closeServer();
  });

  test("token bucket ALLOW over HTTPS HTTP/2", async () => {
    sessionManager = new Http2SessionManager(baseUrl, undefined, { ca });
    const transport = createConnectTransport({
      baseUrl,
      httpVersion: "2",
      sessionManager,
    });
    const arcjet = launchArcjetWithTransport({ key: "ajkey_dummy", transport });
    const limit = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
    const input = limit({ key: "user_1" });

    const decision = await arcjet.guard({
      label: "test.bun.h2",
      rules: [input],
    });

    expect(decision.conclusion).toBe("ALLOW");
    expect(decision.hasError()).toBe(false);

    const result = input.result(decision);
    expect(result).toBeDefined();
    expect(result!.remainingTokens).toBe(95);
  });
});
