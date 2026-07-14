/**
 * Runtime smoke test: Node.js HTTP/2 transport.
 *
 * Tests both cleartext HTTP/2 (h2c) and TLS HTTP/2 (h2) with a
 * self-signed certificate. Each starts a real server with the mock
 * DecideService and uses `@connectrpc/connect-node` end-to-end.
 *
 * Node's built-in `fetch` (undici) does not negotiate HTTP/2 via ALPN
 * — `allowH2` defaults to `false` and will not be flipped until Node 25.
 * See {@link https://github.com/nodejs/undici/issues/2750}. For HTTP/2
 * on Node, `@connectrpc/connect-node` uses `node:http2` directly via
 * `Http2SessionManager`, bypassing fetch entirely.
 */

import assert from "node:assert/strict";
import { describe, test, before, after } from "node:test";

import {
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  defineCustomRule,
} from "@arcjet/guard";
import { createConnectTransport, Http2SessionManager } from "@connectrpc/connect-node";

import { createHttp2Transport } from "../../src/transport-http2.ts";
import type { Http2TransportHandle } from "../../src/transport-http2.ts";
import { cases } from "../_shared/cases.ts";
import type { GuardSurface } from "../_shared/cases.ts";
import {
  startH2Server,
  startH2SecureServer,
  getLastCapturedUserAgent,
} from "../_shared/mock-server.ts";

const surface: GuardSurface = {
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  defineCustomRule,
};

describe("In-memory shared cases (Node entrypoint)", () => {
  for (const tc of cases) {
    test(tc.name, () => tc.run(surface));
  }
});

describe("Runtime: Node.js HTTP/2 transport", () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;
  let sessionManager: Http2SessionManager;

  before(async () => {
    ({ baseUrl, close: closeServer } = await startH2Server());
  });

  after(async () => {
    if (sessionManager !== undefined) sessionManager.abort();
    await closeServer();
  });

  test("token bucket ALLOW over real HTTP/2", async () => {
    sessionManager = new Http2SessionManager(baseUrl);
    const transport = createConnectTransport({
      baseUrl,
      httpVersion: "2",
      sessionManager,
    });
    const arcjet = launchArcjetWithTransport({ key: "ajkey_dummy", transport });
    const limit = tokenBucket({
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = limit({ key: "user_1" });

    const decision = await arcjet.guard({
      label: "test.h2",
      rules: [input],
    });

    assert.equal(decision.conclusion, "ALLOW");
    // oxlint-disable-next-line typescript/no-deprecated -- back-compat coverage of the deprecated hasError()
    assert.equal(decision.hasError(), false);

    const result = input.result(decision);
    assert.ok(result);
    assert.equal(result.remainingTokens, 95);

    // Verify user agent includes WinterCG key and Node.js navigator
    assert.match(getLastCapturedUserAgent(), /^arcjet-guard-js\//);
    assert.match(getLastCapturedUserAgent(), /node\/\d+/);
    assert.match(getLastCapturedUserAgent(), /Node\.js/);
  });
});

describe("Runtime: Node.js HTTP/2 over TLS (self-signed)", () => {
  let baseUrl: string;
  let ca: string;
  let closeServer: () => Promise<void>;
  let sessionManager: Http2SessionManager;

  before(async () => {
    ({ baseUrl, ca, close: closeServer } = await startH2SecureServer());
  });

  after(async () => {
    if (sessionManager !== undefined) sessionManager.abort();
    await closeServer();
  });

  test("token bucket ALLOW over real HTTPS HTTP/2 with self-signed cert", async () => {
    sessionManager = new Http2SessionManager(baseUrl, undefined, { ca });
    const transport = createConnectTransport({
      baseUrl,
      httpVersion: "2",
      sessionManager,
    });
    const arcjet = launchArcjetWithTransport({ key: "ajkey_dummy", transport });
    const limit = tokenBucket({
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = limit({ key: "user_1" });

    const decision = await arcjet.guard({
      label: "test.h2tls",
      rules: [input],
    });

    assert.equal(decision.conclusion, "ALLOW");
    // oxlint-disable-next-line typescript/no-deprecated -- back-compat coverage of the deprecated hasError()
    assert.equal(decision.hasError(), false);

    const result = input.result(decision);
    assert.ok(result);
    assert.equal(result.remainingTokens, 95);
  });
});

describe("Runtime: guard HTTP/2 transport factory (keep-alive + recycling)", () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;
  let handle: Http2TransportHandle | undefined;

  before(async () => {
    ({ baseUrl, close: closeServer } = await startH2Server());
  });

  after(async () => {
    if (handle !== undefined) handle.sessionManager.abort();
    await closeServer();
  });

  test("guard call succeeds through the production transport factory", async () => {
    // Exercises `createHttp2Transport` itself — PING keep-alive options and
    // the connection-recycling wrapper — against a real HTTP/2 server, unlike
    // the transports above, which are assembled by hand.
    handle = createHttp2Transport(baseUrl);
    const arcjet = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport: handle.transport,
    });
    const limit = tokenBucket({
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = limit({ key: "user_1" });

    const decision = await arcjet.guard({
      label: "test.h2.factory",
      rules: [input],
    });

    assert.equal(decision.conclusion, "ALLOW");
    const result = input.result(decision);
    assert.ok(result);
    assert.equal(result.remainingTokens, 95);
  });
});
