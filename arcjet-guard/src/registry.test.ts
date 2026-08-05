import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { recorder, recorderWithDiagnostics } from "../test/_shared/registry-recorder.ts";
import type { ArcjetGuard } from "./index.ts";
import { registeredClient } from "./registration-slot.ts";
import { capture, flush, guard, registerArcjet, unregisterArcjet } from "./registry.ts";

// Registration is process-wide, so a test that leaves a client behind changes
// the meaning of every test after it.
afterEach(() => {
  unregisterArcjet();
});

describe("registerArcjet", () => {
  test("routes the free calls to the registered client", async () => {
    const client = recorder();
    registerArcjet(client);

    await guard({ label: "test", rules: [] });
    capture({ action: "test.done" });
    await flush(50);

    assert.equal(client.guards.length, 1);
    assert.equal(client.guards[0]?.label, "test");
    assert.equal(client.captures.length, 1);
    assert.equal(client.captures[0]?.action, "test.done");
    assert.deepEqual(client.flushes, [50]);
  });

  test("keeps the incumbent when a second client registers", () => {
    const first = recorderWithDiagnostics();

    registerArcjet(first);
    registerArcjet(recorder());

    assert.equal(registeredClient(), first);
  });

  test("reports the refused registration on the incumbent's channel", () => {
    const first = recorderWithDiagnostics();

    registerArcjet(first);
    registerArcjet(recorder());

    // The warning belongs to whoever registered first: it is their telemetry a
    // silent takeover would have redirected.
    assert.equal(first.diagnostics.length, 1);
    assert.equal(first.diagnostics[0]?.code, "AJ3004");
  });

  test("re-registering the same client is silent", () => {
    const client = recorderWithDiagnostics();

    registerArcjet(client);
    registerArcjet(client);

    assert.equal(registeredClient(), client);
    // A module evaluated twice must not look like a takeover attempt.
    assert.deepEqual(client.diagnostics, []);
  });

  test("a client with no diagnostics channel does not throw", () => {
    registerArcjet(recorder());

    assert.doesNotThrow(() => {
      registerArcjet(recorder());
    });
  });

  test("refuses a value that is not a client", () => {
    // Reachable from plain JavaScript, which bypasses the types entirely —
    // which is the point, so the assertions here are deliberate.
    // oxlint-disable typescript/no-unsafe-type-assertion -- simulating a plain-JS caller
    registerArcjet(null as unknown as ArcjetGuard);
    registerArcjet({ guard: "not a function" } as unknown as ArcjetGuard);
    // oxlint-enable typescript/no-unsafe-type-assertion

    assert.equal(registeredClient(), undefined);
  });
});

describe("unregisterArcjet", () => {
  test("clears the registration", () => {
    registerArcjet(recorder());
    unregisterArcjet();

    assert.equal(registeredClient(), undefined);
  });

  test("is safe to call with nothing registered", () => {
    assert.doesNotThrow(() => {
      unregisterArcjet();
    });
  });
});

describe("with nothing registered", () => {
  test("guard() fails open rather than throwing", async () => {
    const decision = await guard({ label: "test", rules: [] });

    // Both halves matter. A plain ALLOW would also satisfy the first
    // assertion, and that is the actual bug worth catching: a silent bypass
    // that looks exactly like a guard which ran and permitted the call.
    assert.equal(decision.conclusion, "ALLOW");
    assert.equal(decision.hasFailedOpen(), true);
  });

  test("the fail-open decision carries an error result", async () => {
    const decision = await guard({ label: "test", rules: [] });

    const errors = decision.errorResults();
    assert.equal(errors.length, 1);
    assert.match(errors[0]?.message ?? "", /no registered Arcjet client/i);
  });

  test("capture() drops the event without throwing", () => {
    assert.doesNotThrow(() => {
      capture({ action: "test.done" });
    });
  });

  test("flush() resolves", async () => {
    await assert.doesNotReject(flush());
  });
});
