import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { createFailOpenDecision } from "./client.ts";
import { symbolArcjetDiagnostics, type ArcjetDiagnostic } from "./diagnostics.ts";
import type { ArcjetGuard } from "./index.ts";
import {
  capture,
  flush,
  guard,
  registerArcjet,
  registerArcjetForTesting,
  registeredClient,
  unregisterArcjet,
} from "./registry.ts";
import { symbolArcjetClient } from "./symbol.ts";
import type { CaptureOptions, Decision, GuardOptions } from "./types.ts";
import { VERSION } from "./version.ts";

type Recorder = ArcjetGuard & {
  guards: GuardOptions[];
  captures: CaptureOptions[];
  flushes: (number | undefined)[];
};

function recorder(): Recorder {
  const guards: GuardOptions[] = [];
  const captures: CaptureOptions[] = [];
  const flushes: (number | undefined)[] = [];
  return {
    guards,
    captures,
    flushes,
    guard(options: GuardOptions): Promise<Decision> {
      guards.push(options);
      return Promise.resolve(createFailOpenDecision("stub"));
    },
    capture(options: CaptureOptions): void {
      captures.push(options);
    },
    flush(timeoutMs?: number): Promise<void> {
      flushes.push(timeoutMs);
      return Promise.resolve();
    },
  };
}

/** A client that records what the registry reported to it. */
function recorderWithDiagnostics(): Recorder & { diagnostics: ArcjetDiagnostic[] } {
  const diagnostics: ArcjetDiagnostic[] = [];
  return Object.assign(recorder(), {
    diagnostics,
    [symbolArcjetDiagnostics]: (diagnostic: ArcjetDiagnostic): void => {
      diagnostics.push(diagnostic);
    },
  });
}

/** Put an arbitrary value in the global slot, bypassing `registerArcjet`. */
function writeSlot(value: unknown): void {
  Object.defineProperty(globalThis, symbolArcjetClient, {
    configurable: true,
    enumerable: false,
    value,
    writable: true,
  });
}

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
    const second = recorder();

    registerArcjet(first);
    registerArcjet(second);

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

  test("registers under a Symbol.for slot two package copies can share", () => {
    const client = recorder();
    registerArcjet(client);

    // Resolved independently of the module's own import, which is the whole
    // point: a second copy of @arcjet/guard reaches the same slot.
    const slot = Symbol.for("arcjet.guard.client");
    assert.equal(symbolArcjetClient, slot);

    const stored = (globalThis as Record<symbol, unknown>)[slot];
    assert.deepEqual(stored, { version: VERSION, client });
  });

  test("refuses a value that is not a client", () => {
    // Reachable from plain JavaScript, which bypasses the types entirely —
    // which is the whole point, so the assertions here are deliberate.
    // oxlint-disable typescript/no-unsafe-type-assertion -- simulating a plain-JS caller
    registerArcjet(null as unknown as ArcjetGuard);
    registerArcjet({ guard: "not a function" } as unknown as ArcjetGuard);
    // oxlint-enable typescript/no-unsafe-type-assertion

    assert.equal(registeredClient(), undefined);
  });
});

describe("version checking", () => {
  test("ignores a registration written by a different SDK version", () => {
    writeSlot({ version: "0.0.0-other", client: recorder() });

    // Exact match, not a range: the stored value is a live object whose
    // internals are only guaranteed within one build.
    assert.equal(registeredClient(), undefined);
  });

  test("a foreign-version registration makes the free calls fail open", async () => {
    writeSlot({ version: "0.0.0-other", client: recorder() });

    const decision = await guard({ label: "test", rules: [] });

    assert.equal(decision.conclusion, "ALLOW");
    assert.equal(decision.hasFailedOpen(), true);
  });

  test("a foreign-version incumbent is not displaced", () => {
    const foreign = recorder();
    writeSlot({ version: "0.0.0-other", client: foreign });

    const mine = recorderWithDiagnostics();
    registerArcjet(mine);

    // Displacing it would break the other copy's free calls, so this copy
    // degrades to failing open instead.
    assert.deepEqual((globalThis as Record<symbol, unknown>)[symbolArcjetClient], {
      version: "0.0.0-other",
      client: foreign,
    });
    assert.equal(registeredClient(), undefined);
  });

  test("the version clash is reported on the registrant's own channel", () => {
    writeSlot({ version: "0.0.0-other", client: recorder() });

    const mine = recorderWithDiagnostics();
    registerArcjet(mine);

    // Not the incumbent's: it belongs to a build whose internals this one
    // cannot verify, so calling into it is exactly what must not happen.
    assert.equal(mine.diagnostics.length, 1);
    assert.equal(mine.diagnostics[0]?.code, "AJ3006");
  });

  test("ignores a malformed slot without throwing", () => {
    for (const value of [null, 42, "nope", {}, { version: 1, client: recorder() }]) {
      writeSlot(value);

      assert.equal(registeredClient(), undefined);
      assert.doesNotThrow(() => {
        capture({ action: "test.done" });
      });
    }
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

  test("leaves the slot absent rather than set to undefined", () => {
    registerArcjet(recorder());
    unregisterArcjet();

    // `in` rather than a value check: a lingering own property set to undefined
    // would still read as "registered" to anything using `in`.
    assert.equal(symbolArcjetClient in globalThis, false);
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

describe("launch and register are separate", () => {
  test("registerArcjetForTesting throws when something is registered", () => {
    registerArcjet(recorder());

    assert.throws(
      () => {
        registerArcjetForTesting(recorder());
      },
      /already registered/i,
      "a leaked registration must fail loudly under test, not warn and continue",
    );
  });

  test("registerArcjetForTesting registers when the slot is free", () => {
    const client = recorder();
    registerArcjetForTesting(client);

    assert.equal(registeredClient(), client);
  });
});
