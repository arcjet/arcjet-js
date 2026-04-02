/**
 * Runtime test: Bun — shared in-memory cases + connect-node HTTP/2 over TLS.
 *
 * 1. Runs the full shared test suite using in-memory transport
 * 2. Runs a smoke test over real HTTPS HTTP/2 with a self-signed cert
 *
 * Bun's `fetch` does not support HTTP/2 (https://github.com/oven-sh/bun/issues/7194),
 * but `node:http2` works well (95% of gRPC tests pass). The `"bun"` export
 * condition in package.json resolves to the `node` entrypoint which uses
 * `@connectrpc/connect-node` and `node:http2` directly.
 *
 * Run: bun test test/runtime/bun.test.ts
 */

import { describe, test, beforeAll, afterAll, expect } from "bun:test";

import {
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
} from "@arcjet/guard";
import { createConnectTransport, Http2SessionManager } from "@connectrpc/connect-node";

import { cases } from "../_shared/cases.ts";
import type { GuardSurface } from "../_shared/cases.ts";
import { startH2SecureServer, getLastCapturedUserAgent } from "../_shared/mock-server.ts";

const surface: GuardSurface = {
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
};

describe("In-memory shared cases (Bun entrypoint)", () => {
  for (const tc of cases) {
    test(tc.name, () => tc.run(surface));
  }
});

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

    // Verify user agent includes WinterCG key and Bun navigator
    const ua = getLastCapturedUserAgent();
    expect(ua).toMatch(/^arcjet-guard-js\//);
    expect(ua).toMatch(/bun\/\d+/);
    expect(ua).toMatch(/Bun\//);
  });
});
