/**
 * Shared cases for a policy callback that throws or returns something Guard
 * cannot use, run once per helper entry point.
 *
 * Every helper resolves `rules`, `metadata`, `action` and `sessionId` through
 * `resolveCallPolicy` and hands the failure to `runGuarded` or `runGate` as
 * `degraded`. The property this pins is the same everywhere: the failure never
 * escapes and never skips the guard call, remote policy still evaluates, and
 * `onGuardError` decides. Each helper's test file supplies a driver that
 * builds the helper and makes one call; the cases are named after the driver,
 * so a regression in one helper fails by that helper's name.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import type { ArcjetAgentClient } from "../../src/agents/capture.ts";
import { tokenBucket } from "../../src/rules.ts";
import { recorded } from "./source-scan.ts";
import { decisionAllow, decisionDenyRateLimit, fakeRule, stubClient } from "./stub-client.ts";

/**
 * The fields a case sets. Values are deliberately loose: several cases pass a
 * callback whose return value the policy's own type would reject.
 */
export interface CallbackCasePolicy {
  action?: unknown;
  rules?: unknown;
  metadata?: unknown;
  sessionId?: unknown;
  onGuardError?: "allow" | "deny";
}

export interface CallbackFailureDriver {
  /** Names the cases, e.g. `"vercel-ai guardTool"`. */
  name: string;
  /**
   * Build the helper over `client` with `policy` merged into whatever else it
   * needs (a static `action` included, unless `policy` sets one), make one
   * call, and report whether the wrapped work ran — or, for a gate, whether
   * the call was permitted.
   */
  run(client: ArcjetAgentClient, policy: CallbackCasePolicy): Promise<boolean>;
  /** The label sent when `policy` sets no `action`. */
  action: string;
  /**
   * The label sent when an `action` callback fails. Omit for a helper whose
   * policy takes no `action` callback.
   */
  fallbackAction?: string;
  /** Whether the policy takes a `metadata` callback. */
  metadata: boolean;
  /** Whether the policy takes a `sessionId` callback. */
  sessionId: boolean;
  /**
   * The capture outcome of a call that proceeded on a complete judgement:
   * `"success"` for a helper that runs the work, `"allowed"` for a gate.
   */
  allowedOutcome: "success" | "allowed";
  /**
   * The capture outcome of a call `onGuardError: "allow"` let proceed after a
   * callback failed: `"degraded"` for a helper that runs the work. A gate's
   * allow tail has no degraded outcome and records `"allowed"`.
   */
  degradedOutcome: "degraded" | "allowed";
}

function throwing(): never {
  throw new Error("callback exploded");
}

/**
 * Run `fn`, then wait a macrotask so a rejection nobody handled has been
 * reported, and fail if one was.
 */
async function withoutUnhandledRejection<T>(fn: () => Promise<T>): Promise<T> {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown): void => {
    unhandled.push(reason);
  };
  process.on("unhandledRejection", onUnhandled);
  try {
    const result = await fn();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, [], "a callback's rejected promise must be handled");
    return result;
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
}

function guardField(guardCalls: unknown[], field: string): unknown {
  assert.equal(guardCalls.length, 1, "Guard must be called exactly once");
  return recorded(guardCalls[0])[field];
}

function guardMetadata(guardCalls: unknown[]): Record<string, unknown> {
  const metadata = guardField(guardCalls, "metadata");
  assert.ok(typeof metadata === "object" && metadata !== null);
  return recorded(metadata);
}

/** The outcome and decision ID of the capture event that carries an outcome. */
function outcomeCapture(captureCalls: unknown[]): { outcome: unknown; decisionId: unknown } {
  const withOutcome = captureCalls
    .map((call) => recorded(call))
    .filter((call) => {
      const metadata = call["metadata"];
      return typeof metadata === "object" && metadata !== null && "outcome" in metadata;
    });
  assert.equal(withOutcome.length, 1, "exactly one capture must record an outcome");
  const capture = withOutcome[0];
  return { outcome: recorded(capture["metadata"])["outcome"], decisionId: capture["decisionId"] };
}

/**
 * Register the cases for one helper entry point.
 */
export function callbackFailureCases(driver: CallbackFailureDriver): void {
  const { name } = driver;

  test(`${name}: a throwing rules callback still calls Guard, with no rules, and refuses by default`, async () => {
    const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
    const ran = await driver.run(client, { rules: throwing });
    assert.deepEqual(guardField(guardCalls, "rules"), []);
    assert.equal(ran, false);
    assert.deepEqual(outcomeCapture(captureCalls), {
      outcome: "unavailable",
      decisionId: "gdec_allow1",
    });
  });

  test(`${name}: a throwing rules callback under onGuardError allow calls Guard and proceeds degraded`, async () => {
    const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
    const ran = await driver.run(client, { rules: throwing, onGuardError: "allow" });
    assert.deepEqual(guardField(guardCalls, "rules"), []);
    assert.equal(ran, true);
    assert.equal(outcomeCapture(captureCalls).outcome, driver.degradedOutcome);
  });

  test(`${name}: a throwing rules callback does not override a remote DENY`, async () => {
    const { client, guardCalls, captureCalls } = stubClient(decisionDenyRateLimit(1_700_000_000));
    const ran = await driver.run(client, { rules: throwing, onGuardError: "allow" });
    assert.deepEqual(guardField(guardCalls, "rules"), []);
    assert.equal(ran, false);
    assert.equal(outcomeCapture(captureCalls).outcome, "denied");
  });

  test(`${name}: a rules callback returning a non-array calls Guard with no rules and refuses`, async () => {
    const { client, guardCalls } = stubClient(decisionAllow());
    const ran = await driver.run(client, { rules: (): unknown => ({ not: "rules" }) });
    assert.deepEqual(guardField(guardCalls, "rules"), []);
    assert.equal(ran, false);
  });

  test(`${name}: a rules callback returning an unbound rule calls Guard with no rules and refuses`, async () => {
    const { client, guardCalls } = stubClient(decisionAllow());
    const unbound = tokenBucket({ refillRate: 1, intervalSeconds: 1, maxTokens: 1 });
    const ran = await driver.run(client, { rules: (): unknown[] => [unbound] });
    assert.deepEqual(guardField(guardCalls, "rules"), []);
    assert.equal(ran, false);
  });

  test(`${name}: a rules callback returning a promise calls Guard with no rules and refuses`, async () => {
    const { client, guardCalls } = stubClient(decisionAllow());
    const ran = await driver.run(client, { rules: (): unknown => Promise.resolve([]) });
    assert.deepEqual(guardField(guardCalls, "rules"), []);
    assert.equal(ran, false);
  });

  if (driver.metadata) {
    test(`${name}: a metadata callback returning a promise is left out and refuses by default`, async () => {
      const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
      const ran = await driver.run(client, {
        metadata: (): unknown => Promise.resolve({ fromCallback: "yes" }),
      });
      assert.equal("fromCallback" in guardMetadata(guardCalls), false);
      assert.equal(ran, false);
      assert.equal(outcomeCapture(captureCalls).outcome, "unavailable");
    });

    test(`${name}: a metadata callback returning a rejected promise is handled and refuses`, async () => {
      const { client, guardCalls } = stubClient(decisionAllow());
      const ran = await withoutUnhandledRejection(() =>
        driver.run(client, {
          metadata: (): unknown => Promise.reject(new Error("metadata rejected")),
        }),
      );
      guardMetadata(guardCalls);
      assert.equal(ran, false);
    });

    test(`${name}: a throwing metadata callback still calls Guard and refuses by default`, async () => {
      const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
      const ran = await driver.run(client, { metadata: throwing });
      guardMetadata(guardCalls);
      assert.equal(ran, false);
      assert.equal(outcomeCapture(captureCalls).outcome, "unavailable");
    });

    test(`${name}: a metadata callback returning a non-object is left out of the guard call`, async () => {
      const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
      const ran = await driver.run(client, {
        metadata: (): unknown => "nope",
        onGuardError: "allow",
      });
      // Spreading the string would have added its indices as keys.
      assert.equal("0" in guardMetadata(guardCalls), false);
      assert.equal(ran, true);
      assert.equal(outcomeCapture(captureCalls).outcome, driver.degradedOutcome);
    });
  }

  if (driver.fallbackAction !== undefined) {
    const fallback = driver.fallbackAction;

    test(`${name}: a throwing action callback calls Guard with the default label and refuses`, async () => {
      const { client, guardCalls } = stubClient(decisionAllow());
      const ran = await driver.run(client, { action: throwing });
      assert.equal(guardField(guardCalls, "label"), fallback);
      assert.equal(ran, false);
    });

    test(`${name}: an action callback returning a non-string calls Guard with the default label`, async () => {
      const { client, guardCalls } = stubClient(decisionAllow());
      const ran = await driver.run(client, { action: (): unknown => 42 });
      assert.equal(guardField(guardCalls, "label"), fallback);
      assert.equal(ran, false);
    });

    test(`${name}: an action callback returning an invalid label string sends it unchanged`, async () => {
      const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
      const ran = await driver.run(client, { action: (): string => "Not A Label" });
      // The service judges a call-time label; nothing local replaces it.
      assert.equal(guardField(guardCalls, "label"), "Not A Label");
      assert.equal(ran, true);
      assert.equal(outcomeCapture(captureCalls).outcome, driver.allowedOutcome);
    });
  }

  if (driver.sessionId) {
    test(`${name}: a throwing sessionId callback still calls Guard and refuses by default`, async () => {
      const { client, guardCalls } = stubClient(decisionAllow());
      const ran = await driver.run(client, { sessionId: throwing });
      assert.equal(guardCalls.length, 1);
      assert.equal(ran, false);
    });
  }

  test(`${name}: callbacks that succeed reach Guard unchanged`, async () => {
    const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
    const ran = await driver.run(client, {
      rules: (): unknown[] => [fakeRule],
      ...(driver.metadata && {
        metadata: (): Record<string, string> => ({ "test.key": "from-callback" }),
      }),
      ...(driver.fallbackAction !== undefined && { action: (): string => "callback.label" }),
    });
    assert.deepEqual(guardField(guardCalls, "rules"), [fakeRule]);
    if (driver.metadata) {
      assert.equal(guardMetadata(guardCalls)["test.key"], "from-callback");
    }
    if (driver.fallbackAction !== undefined) {
      assert.equal(guardField(guardCalls, "label"), "callback.label");
    }
    assert.equal(ran, true);
    assert.equal(outcomeCapture(captureCalls).outcome, driver.allowedOutcome);
  });

  test(`${name}: static values reach Guard unchanged`, async () => {
    const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
    const ran = await driver.run(client, {
      rules: [fakeRule],
      ...(driver.metadata && { metadata: { "test.key": "static" } }),
    });
    assert.deepEqual(guardField(guardCalls, "rules"), [fakeRule]);
    assert.equal(guardField(guardCalls, "label"), driver.action);
    if (driver.metadata) {
      assert.equal(guardMetadata(guardCalls)["test.key"], "static");
    }
    assert.equal(ran, true);
    assert.equal(outcomeCapture(captureCalls).outcome, driver.allowedOutcome);
  });
}
