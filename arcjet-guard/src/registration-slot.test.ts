import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { recorder, recorderWithDiagnostics, writeSlot } from "../test/_shared/registry-recorder.ts";
import { registeredClient } from "./registration-slot.ts";
import { capture, guard, registerArcjet, unregisterArcjet } from "./registry.ts";
import { symbolArcjetClient } from "./symbol.ts";
import { VERSION } from "./version.ts";

// Registration is process-wide, so a test that leaves a client behind changes
// the meaning of every test after it.
afterEach(() => {
  unregisterArcjet();
});

describe("the global slot", () => {
  test("is a Symbol.for slot two package copies can share", () => {
    const client = recorder();
    registerArcjet(client);

    // Resolved independently of the module's own import, which is the whole
    // point: a second copy of @arcjet/guard reaches the same slot.
    const slot = Symbol.for("arcjet.guard.client");
    assert.equal(symbolArcjetClient, slot);

    const stored = (globalThis as Record<symbol, unknown>)[slot];
    assert.deepEqual(stored, { version: VERSION, client });
  });

  test("holds the version alongside the client", () => {
    const client = recorder();
    registerArcjet(client);

    assert.deepEqual((globalThis as Record<symbol, unknown>)[symbolArcjetClient], {
      version: VERSION,
      client,
    });
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

    registerArcjet(recorderWithDiagnostics());

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
});

describe("reading a hostile slot", () => {
  test("ignores anything malformed without throwing", () => {
    for (const value of [null, 42, "nope", {}, { version: 1, client: recorder() }]) {
      writeSlot(value);

      assert.equal(registeredClient(), undefined);
      assert.doesNotThrow(() => {
        capture({ action: "test.done" });
      });
    }
  });

  test("ignores a registration whose client is not callable", () => {
    writeSlot({ version: VERSION, client: { guard: "nope" } });

    assert.equal(registeredClient(), undefined);
    assert.doesNotThrow(() => {
      capture({ action: "test.done" });
    });
  });
});
