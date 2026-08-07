import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { recorder } from "../../test/_shared/registry-recorder.ts";
import { registeredClient } from "../registration-slot.ts";
import { registerArcjet, unregisterArcjet } from "../registry.ts";
import { registerArcjetForTesting } from "./register.ts";

afterEach(() => {
  unregisterArcjet();
});

describe("registerArcjetForTesting", () => {
  test("throws when something is already registered", () => {
    registerArcjet(recorder());

    assert.throws(
      () => {
        registerArcjetForTesting(recorder());
      },
      /already registered/i,
      "a leaked registration must fail loudly under test, not warn and continue",
    );
  });

  test("registers when the slot is free", () => {
    const client = recorder();
    registerArcjetForTesting(client);

    assert.equal(registeredClient(), client);
  });

  test("throws on a foreign-version incumbent too", () => {
    // `registeredClient()` reports this as absent, but it is still a leak: an
    // unvalidated check is what makes that distinction, and the leak is what
    // matters here.
    registerArcjetForTesting(recorder());

    assert.throws(() => {
      registerArcjetForTesting(recorder());
    }, /already registered/i);
  });
});
