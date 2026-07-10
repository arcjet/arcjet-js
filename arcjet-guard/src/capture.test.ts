/**
 * Integration tests for `@arcjet/guard`'s experimental `capture()` using
 * Connect RPC in-memory server (`createRouterTransport`).
 *
 * `capture()` is fire-and-forget and returns `void`, so tests await a
 * deferred promise that resolves once the mock RPC handler has been called,
 * rather than awaiting `capture()` itself.
 *
 * @see https://connectrpc.com/docs/node/testing/#testing-against-an-in-memory-server
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { create } from "@bufbuild/protobuf";
import type { Transport } from "@connectrpc/connect";
import { createRouterTransport, ConnectError, Code } from "@connectrpc/connect";

import { launchArcjetWithTransport } from "./index.ts";
import type { ArcjetGuard } from "./index.ts";
import {
  DecideService,
  CaptureResponseSchema,
  type CaptureRequest,
} from "./proto/proto/decide/v2/decide_pb.js";

/** A promise that resolves (with `value`) the first time `resolve` is called. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Build a mock transport that responds to Capture with the given handler. */
function mockCaptureTransport(
  handler: (
    req: CaptureRequest,
    context: { requestHeader: Headers },
  ) => import("./proto/proto/decide/v2/decide_pb.js").CaptureResponse,
): Transport {
  return createRouterTransport(({ service }) => {
    service(DecideService, {
      capture: handler,
    });
  });
}

describe("experimental_capture", () => {
  test("sends action, correlationId, decisionId, and metadata", async () => {
    const { promise, resolve } = deferred<CaptureRequest>();

    const transport = mockCaptureTransport((req) => {
      resolve(req);
      return create(CaptureResponseSchema, {});
    });

    const arcjet: ArcjetGuard = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });

    arcjet.experimental_capture({
      action: "refund.issued",
      correlationId: "wf_abcdef",
      decisionId: "gdec_abc",
      metadata: { invoice: "inv_123" },
    });

    const req = await promise;
    assert.equal(req.events.length, 1);
    const event = req.events[0];
    assert.equal(event.action, "refund.issued");
    assert.equal(event.correlationId, "wf_abcdef");
    assert.equal(event.decisionId, "gdec_abc");
    assert.deepEqual({ ...event.metadata }, { invoice: "inv_123" });
    assert.ok(event.eventId.length > 0);
    assert.ok(event.occurredAtUnixMs > 0n);
  });

  test("mints a unique event_id per call", async () => {
    const seen: CaptureRequest[] = [];
    const { promise: firstSeen, resolve: resolveFirst } = deferred<void>();

    const transport = mockCaptureTransport((req) => {
      seen.push(req);
      if (seen.length === 2) {
        resolveFirst();
      }
      return create(CaptureResponseSchema, {});
    });

    const arcjet: ArcjetGuard = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });

    arcjet.experimental_capture({ action: "refund.issued" });
    arcjet.experimental_capture({ action: "refund.declined" });

    await firstSeen;
    assert.equal(seen.length, 2);
    assert.notEqual(seen[0].events[0].eventId, seen[1].events[0].eventId);
  });

  test("correlationId, decisionId, and metadata are optional", async () => {
    const { promise, resolve } = deferred<CaptureRequest>();

    const transport = mockCaptureTransport((req) => {
      resolve(req);
      return create(CaptureResponseSchema, {});
    });

    const arcjet: ArcjetGuard = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });

    arcjet.experimental_capture({ action: "refund.issued" });

    const req = await promise;
    const event = req.events[0];
    assert.equal(event.correlationId, "");
    assert.equal(event.decisionId, "");
    assert.deepEqual({ ...event.metadata }, {});
  });

  test("user-agent is sent in the request body", async () => {
    const { promise, resolve } = deferred<CaptureRequest>();

    const transport = mockCaptureTransport((req) => {
      resolve(req);
      return create(CaptureResponseSchema, {});
    });

    const arcjet: ArcjetGuard = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });

    arcjet.experimental_capture({ action: "refund.issued" });

    const req = await promise;
    assert.ok(req.userAgent.startsWith("arcjet-guard-js/"));
  });

  test("API key is sent as Bearer token", async () => {
    let receivedAuth: string | null = null;
    const { promise, resolve } = deferred<void>();

    const transport = createRouterTransport(({ service }) => {
      service(DecideService, {
        capture: (_req, context) => {
          receivedAuth = context.requestHeader.get("authorization");
          resolve();
          return create(CaptureResponseSchema, {});
        },
      });
    });

    const arcjet: ArcjetGuard = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });

    arcjet.experimental_capture({ action: "refund.issued" });

    await promise;
    assert.equal(receivedAuth, "Bearer ajkey_dummy");
  });

  test("does not throw when the RPC fails", async () => {
    const transport = mockCaptureTransport(() => {
      throw new ConnectError("service unavailable", Code.Unavailable);
    });

    const arcjet: ArcjetGuard = launchArcjetWithTransport({
      key: "ajkey_dummy",
      transport,
    });

    assert.doesNotThrow(() => {
      arcjet.experimental_capture({ action: "refund.issued" });
    });

    // Give the fire-and-forget promise a tick to settle so an unhandled
    // rejection would surface here rather than after the test completes.
    await new Promise((res) => setTimeout(res, 10));
  });
});
