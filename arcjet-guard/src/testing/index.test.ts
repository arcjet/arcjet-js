import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, test } from "node:test";

import { createFailOpenDecision } from "../client.ts";
import type { ArcjetGuard } from "../index.ts";
import { registeredClient } from "../registration-slot.ts";
import { capture, guard, registerArcjet, unregisterArcjet } from "../registry.ts";
import type { ArcjetMetadata, Decision } from "../types.ts";
import { registerTestClient } from "./index.ts";

/** A client that does nothing, only to occupy the registration slot. */
const occupant: ArcjetGuard = {
  guard(): Promise<Decision> {
    return Promise.resolve(createFailOpenDecision("occupant"));
  },
  capture(): void {},
  flush(): Promise<void> {
    return Promise.resolve();
  },
};

afterEach(() => {
  unregisterArcjet();
});

describe("registerTestClient", () => {
  test("registers itself, so free calls reach it", () => {
    const arcjet = registerTestClient();

    assert.equal(registeredClient(), arcjet);
  });

  test("throws when a client is already registered", () => {
    registerArcjet(occupant);

    // A leak from an earlier test would otherwise have this test assert
    // against the previous test's recorder.
    assert.throws(() => registerTestClient(), /already registered/i);
  });

  test("unregister() clears the registration", () => {
    const arcjet = registerTestClient();
    arcjet.unregister();

    assert.equal(registeredClient(), undefined);
  });

  test("unregister() is safe to call twice", () => {
    const arcjet = registerTestClient();
    arcjet.unregister();

    // An `afterEach` runs after a failed test too, so a second call has to be
    // survivable.
    assert.doesNotThrow(() => {
      arcjet.unregister();
    });
  });

  test("Symbol.dispose unregisters", () => {
    const arcjet = registerTestClient();

    // Called directly rather than through `using`: Node.js 22 defines
    // Symbol.dispose but cannot parse the `using` syntax, and this suite runs
    // on the package's minimum Node.
    arcjet[Symbol.dispose]();

    assert.equal(registeredClient(), undefined);
  });
});

describe("recording captures", () => {
  test("records a capture made through the free function", () => {
    const arcjet = registerTestClient();

    capture({ action: "refund.issued", metadata: { invoice: "inv_1" } });

    assert.equal(arcjet.captures.length, 1);
    assert.equal(arcjet.captures[0]?.action, "refund.issued");
    assert.deepEqual(arcjet.captures[0]?.metadata, { invoice: "inv_1" });
  });

  test("records captures in call order", () => {
    const arcjet = registerTestClient();

    capture({ action: "first" });
    capture({ action: "second" });

    assert.deepEqual(
      arcjet.captures.map((c) => c.action),
      ["first", "second"],
    );
  });

  test("preserves nested metadata through the wire encoding", () => {
    const arcjet = registerTestClient();

    capture({ action: "order.placed", metadata: { items: [1, 2], user: { id: "u1" } } });

    assert.deepEqual(arcjet.captures[0]?.metadata, { items: [1, 2], user: { id: "u1" } });
  });

  test("keeps correlationId and decisionId only when supplied", () => {
    const arcjet = registerTestClient();

    capture({ action: "with", correlationId: "corr_1", decisionId: "dec_1" });
    capture({ action: "without" });

    assert.equal(arcjet.captures[0]?.correlationId, "corr_1");
    assert.equal(arcjet.captures[0]?.decisionId, "dec_1");
    assert.equal(arcjet.captures[1]?.correlationId, undefined);
    assert.equal(arcjet.captures[1]?.decisionId, undefined);
  });

  test("records occurredAt when the call supplies one", () => {
    const arcjet = registerTestClient();
    const occurredAt = new Date("2026-08-04T12:00:00.000Z");

    capture({ action: "backfilled", occurredAt });

    assert.deepEqual(arcjet.captures[0]?.occurredAt, occurredAt);
  });

  test("drops an invalid event exactly as the real client would", () => {
    const arcjet = registerTestClient();

    // An empty `action` is rejected by the same validation the real client
    // runs. Recording the raw input instead would let this test pass while the
    // real client silently dropped the event in production.
    capture({ action: "" });

    assert.deepEqual(arcjet.captures, []);
  });

  test("surfaces encoding warnings on the recorded event", () => {
    const arcjet = registerTestClient();

    const circular: ArcjetMetadata = {};
    circular.self = circular;
    capture({ action: "lossy", metadata: { ok: "kept", bad: circular } });

    const recorded = arcjet.captures[0];
    assert.equal(recorded?.action, "lossy");
    assert.deepEqual(recorded?.metadata, { ok: "kept" });
    assert.ok((recorded?.warnings.length ?? 0) > 0, "the dropped key should be reported");
  });

  test("does not throw on metadata named __proto__", () => {
    const arcjet = registerTestClient();

    const metadata: ArcjetMetadata = {};
    Object.defineProperty(metadata, "__proto__", {
      configurable: true,
      enumerable: true,
      value: { polluted: true },
      writable: true,
    });
    capture({ action: "hostile", metadata });

    const recorded = arcjet.captures[0];
    assert.ok(recorded !== undefined);
    // Recording the key must not have walked the prototype chain.
    const probe: Record<string, unknown> = {};
    assert.equal(probe.polluted, undefined);
  });
});

function exportsMap(): Record<string, unknown> {
  const packageJson: unknown = JSON.parse(
    readFileSync(resolve(import.meta.dirname, "../../package.json"), "utf8"),
  );
  assert.ok(packageJson !== null && typeof packageJson === "object");
  const map = (packageJson as { exports?: Record<string, unknown> }).exports;
  assert.ok(map !== undefined, "package.json must have an exports field");
  return map;
}

describe("the ./testing subpath", () => {
  test("is declared, and points at the built test client", () => {
    assert.deepEqual(exportsMap()["./testing"], {
      types: "./dist/testing/index.d.ts",
      import: "./dist/testing/index.js",
    });
  });

  test("no exports entry reaches the registry or the client", () => {
    // Strict `exports` encapsulation is what keeps `registerArcjetForTesting`,
    // `createFailOpenDecision` and `normalizeCaptureEvent` internal: nothing
    // listed here resolves to the modules that declare them, so importing one
    // throws ERR_PACKAGE_PATH_NOT_EXPORTED at the package boundary.
    const targets = JSON.stringify(exportsMap());

    assert.doesNotMatch(targets, /dist\/registry\./);
    assert.doesNotMatch(targets, /dist\/registration-slot\./);
    assert.doesNotMatch(targets, /dist\/testing\/register\./);
    assert.doesNotMatch(targets, /dist\/client\./);
    assert.doesNotMatch(targets, /dist\/diagnostics\./);
    assert.doesNotMatch(targets, /dist\/symbol\./);
  });
});

describe("recording guards", () => {
  test("records the guard call and answers fail-open", async () => {
    const arcjet = registerTestClient();

    const decision = await guard({ label: "tools.weather", rules: [] });

    assert.equal(arcjet.guards.length, 1);
    assert.equal(arcjet.guards[0]?.label, "tools.weather");
    // Fail-open rather than a plain ALLOW: no rule ran, and a plain ALLOW
    // would claim policy was evaluated. Note that helpers which fail closed on
    // a failed-open decision will therefore deny against this client.
    assert.equal(decision.conclusion, "ALLOW");
    assert.equal(decision.hasFailedOpen(), true);
  });

  test("flush resolves without a queue to drain", async () => {
    const arcjet = registerTestClient();

    await assert.doesNotReject(arcjet.flush());
  });
});
