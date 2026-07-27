import assert from "node:assert/strict";
import { test } from "node:test";

import { create } from "@bufbuild/protobuf";
import { createRouterTransport } from "@connectrpc/connect";

import { registerTestClient } from "../testing.ts";
import {
  capture,
  guard,
  launchArcjetWithTransport,
  registerArcjet,
  unregisterArcjet,
} from "./index.ts";
import { DecideService, GuardResponseSchema } from "./proto/proto/decide/v2/decide_pb.js";

// These call `[Symbol.dispose]()` directly rather than writing a `using`
// declaration. `using` is what we recommend to consumers, but it is a syntax
// transform rather than a type annotation, so Node's built-in type stripping
// cannot downlevel it and the declaration is a syntax error on Node 22 — which
// this package still supports. Calling the method is what `using` desugars to,
// so the behaviour under test is identical.

test("registerTestClient records normalized captures synchronously", async () => {
  const occurredAt = new Date("2026-07-27T12:00:00.000Z");
  const client = registerTestClient();

  try {
    capture({
      action: "refund.issued",
      correlationId: "workflow_123",
      occurredAt,
      metadata: { invoice: { id: "inv_123" }, refunded: true },
    });

    assert.deepEqual(client.captures, [
      {
        action: "refund.issued",
        correlationId: "workflow_123",
        occurredAt,
        metadata: { invoice: { id: "inv_123" }, refunded: true },
        warnings: [],
      },
    ]);
    await client.flush();
  } finally {
    client[Symbol.dispose]();
  }
});

test("registerTestClient records guard calls and returns a clean allow", async () => {
  const client = registerTestClient();

  try {
    const options = { label: "refund", rules: [] };
    const decision = await guard(options);

    assert.deepEqual(client.guards, [options]);
    assert.equal(decision.conclusion, "ALLOW");
    assert.equal(decision.hasFailedOpen(), false);
  } finally {
    client[Symbol.dispose]();
  }
});

test("disposal unregisters the client", () => {
  const client = registerTestClient();
  capture({ action: "first.client" });
  assert.equal(client.captures.length, 1);
  client[Symbol.dispose]();

  // The slot is empty again, so a second test client can claim it rather than
  // throwing. That is what makes disposal enough for test isolation.
  const next = registerTestClient();
  try {
    capture({ action: "second.client" });
    assert.deepEqual(
      next.captures.map((event) => event.action),
      ["second.client"],
    );
  } finally {
    next[Symbol.dispose]();
  }
});

test("registerTestClient throws when the slot is occupied", () => {
  const transport = createRouterTransport(({ service }) => {
    service(DecideService, {
      guard: () => create(GuardResponseSchema, {}),
    });
  });
  const incumbent = launchArcjetWithTransport({ key: "ajkey_test", transport });
  registerArcjet(incumbent);

  try {
    assert.throws(() => registerTestClient(), /while another client is registered/);
  } finally {
    unregisterArcjet();
  }
});
