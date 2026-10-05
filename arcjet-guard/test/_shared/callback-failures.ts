/**
 * Shared cases for a policy callback that throws or returns something Guard
 * cannot use, run once per helper entry point.
 *
 * Every helper resolves `rules`, `metadata`, `action` and `sessionId` through
 * `resolveCallPolicy`, and `actor` and `inputs` through `resolveActorInputs`.
 * A helper that calls Guard hands the first failure to `runGuarded` or
 * `runGate` as `degraded`, and `callbackFailureCases` pins that the failure
 * never escapes and never skips the guard call, remote policy still evaluates,
 * and `onGuardError` decides. A capture-only hook records the call without the
 * failed value, which `captureOnlyCallbackFailureCases` pins. Each helper's
 * test file supplies a driver that builds the helper and makes one call; the
 * cases are named after the driver, so a regression in one helper fails by that
 * helper's name.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import type { ArcjetAgentClient } from "../../src/agents/capture.ts";
import { policyInput } from "../../src/policy-input.ts";
import { tokenBucket } from "../../src/rules.ts";
import { setLogLevel } from "./log-level.ts";
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
  actor?: unknown;
  inputs?: unknown;
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
  /**
   * Set to `false` for a helper whose policy takes `rules` only as a value;
   * the `rules` callback cases are then skipped.
   */
  rules?: false;
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

function rejecting(): Promise<never> {
  return Promise.reject(new Error("callback exploded"));
}

/** The two remote-policy fields, each with a return value Guard cannot use. */
const remoteFields = [
  { field: "actor", unusable: (): unknown => 42 },
  // A plain value where `policyInput` must have built one.
  { field: "inputs", unusable: (): unknown => ({ id: "one" }) },
] as const;

function remoteFailures(
  unusable: () => unknown,
): ReadonlyArray<{ how: string; callback: () => unknown }> {
  return [
    { how: "that throws", callback: throwing },
    { how: "that rejects", callback: rejecting },
    { how: "returning a value Guard cannot use", callback: unusable },
  ];
}

function withRemoteField(field: "actor" | "inputs", value: unknown): CallbackCasePolicy {
  return field === "actor" ? { actor: value } : { inputs: value };
}

function guardField(guardCalls: unknown[], field: string): unknown {
  assert.equal(guardCalls.length, 1, "Guard must be called exactly once");
  return recorded(guardCalls[0])[field];
}

/** Assert that Guard was called exactly once, and without `field`. */
function guardOmits(guardCalls: unknown[], field: string): void {
  assert.equal(guardCalls.length, 1, "Guard must be called exactly once");
  assert.equal(field in recorded(guardCalls[0]), false, `the guard call must not carry ${field}`);
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

/** Run `fn` with warnings on, and return the arguments of each `console.warn`. */
async function collectWarnings(fn: () => Promise<unknown>): Promise<unknown[][]> {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]): void => {
    warnings.push(args);
  };
  const restore = setLogLevel("warn");
  try {
    await fn();
  } finally {
    console.warn = originalWarn;
    restore();
  }
  return warnings;
}

function rulesCallbackCases(driver: CallbackFailureDriver): void {
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
}

function remoteFieldCases(driver: CallbackFailureDriver): void {
  const { name } = driver;

  for (const { field, unusable } of remoteFields) {
    for (const { how, callback } of remoteFailures(unusable)) {
      test(`${name}: an ${field} callback ${how} still calls Guard, without ${field}, and refuses by default`, async () => {
        const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
        const ran = await driver.run(client, withRemoteField(field, callback));
        guardOmits(guardCalls, field);
        assert.equal(ran, false);
        assert.deepEqual(outcomeCapture(captureCalls), {
          outcome: "unavailable",
          decisionId: "gdec_allow1",
        });
      });

      test(`${name}: an ${field} callback ${how} under onGuardError allow calls Guard and proceeds degraded`, async () => {
        const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
        const ran = await driver.run(client, {
          ...withRemoteField(field, callback),
          onGuardError: "allow",
        });
        guardOmits(guardCalls, field);
        assert.equal(ran, true);
        assert.deepEqual(outcomeCapture(captureCalls), {
          outcome: driver.degradedOutcome,
          decisionId: "gdec_allow1",
        });
      });
    }

    test(`${name}: a failing ${field} callback does not override a remote DENY`, async () => {
      const { client, guardCalls, captureCalls } = stubClient(decisionDenyRateLimit(1_700_000_000));
      const ran = await driver.run(client, {
        ...withRemoteField(field, throwing),
        onGuardError: "allow",
      });
      guardOmits(guardCalls, field);
      assert.equal(ran, false);
      assert.deepEqual(outcomeCapture(captureCalls), {
        outcome: "denied",
        decisionId: "gdec_deny1",
      });
    });

    test(`${name}: a failing ${field} callback is reported through the degraded warning`, async () => {
      const { client } = stubClient(decisionAllow());
      const warnings = await collectWarnings(() =>
        driver.run(client, withRemoteField(field, throwing)),
      );
      const degraded = warnings.filter((args) =>
        String(args[0]).includes("evaluated without a failed callback; failing closed"),
      );
      assert.equal(degraded.length, 1);
      const error = degraded[0]?.[2];
      assert.ok(error instanceof Error);
      assert.match(error.message, new RegExp(`the ${field} callback for ".+" threw`));
    });
  }
}

/**
 * Register the cases for one helper entry point.
 */
export function callbackFailureCases(driver: CallbackFailureDriver): void {
  const { name } = driver;

  if (driver.rules !== false) {
    rulesCallbackCases(driver);
  }

  remoteFieldCases(driver);

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
    const inputs = { id: policyInput.server.string("from-callback") };
    const ran = await driver.run(client, {
      ...(driver.rules !== false && { rules: (): unknown[] => [fakeRule] }),
      ...(driver.metadata && {
        metadata: (): Record<string, string> => ({ "test.key": "from-callback" }),
      }),
      ...(driver.fallbackAction !== undefined && { action: (): string => "callback.label" }),
      actor: (): Promise<string> => Promise.resolve("actor-from-callback"),
      inputs: (): typeof inputs => inputs,
    });
    if (driver.rules !== false) {
      assert.deepEqual(guardField(guardCalls, "rules"), [fakeRule]);
    }
    if (driver.metadata) {
      assert.equal(guardMetadata(guardCalls)["test.key"], "from-callback");
    }
    if (driver.fallbackAction !== undefined) {
      assert.equal(guardField(guardCalls, "label"), "callback.label");
    }
    assert.equal(guardField(guardCalls, "actor"), "actor-from-callback");
    assert.equal(guardField(guardCalls, "inputs"), inputs);
    assert.equal(ran, true);
    assert.equal(outcomeCapture(captureCalls).outcome, driver.allowedOutcome);
  });

  test(`${name}: static values reach Guard unchanged`, async () => {
    const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
    const inputs = { id: policyInput.server.string("static") };
    const ran = await driver.run(client, {
      rules: [fakeRule],
      ...(driver.metadata && { metadata: { "test.key": "static" } }),
      actor: "actor-static",
      inputs,
    });
    assert.deepEqual(guardField(guardCalls, "rules"), [fakeRule]);
    assert.equal(guardField(guardCalls, "label"), driver.action);
    if (driver.metadata) {
      assert.equal(guardMetadata(guardCalls)["test.key"], "static");
    }
    assert.equal(guardField(guardCalls, "actor"), "actor-static");
    assert.deepEqual(guardField(guardCalls, "inputs"), inputs);
    assert.equal(ran, true);
    assert.equal(outcomeCapture(captureCalls).outcome, driver.allowedOutcome);
  });
}

export interface CaptureOnlyCallbackFailureDriver {
  /** Names the cases, e.g. `"mastra guardHooks afterToolCall"`. */
  name: string;
  /** Build the hook over `client` with `policy` and fire it for one tool call. */
  run(client: ArcjetAgentClient, policy: CallbackCasePolicy): Promise<void>;
  /** The label recorded when `policy` sets no `action`. */
  action: string;
  /** The `outcome` the hook records for the tool call `run` reports. */
  outcome: string;
}

/**
 * Register the cases for one capture-only hook: one that records what a tool
 * call did after it ran and makes no Guard call.
 *
 * A failed `action` or `metadata` callback must not cost the record. The
 * property pinned here is that the hook records exactly what it records for a
 * policy without that callback — the default label, or only the metadata the
 * hook derives itself — with the tool's own `outcome`, and still makes no Guard
 * call.
 */
export function captureOnlyCallbackFailureCases(driver: CaptureOnlyCallbackFailureDriver): void {
  const { name } = driver;

  /** The one capture the hook records for `policy`, with Guard never called. */
  async function captureFor(policy: CallbackCasePolicy): Promise<Record<string, unknown>> {
    const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
    await driver.run(client, policy);
    assert.equal(guardCalls.length, 0, "a capture-only hook must not call Guard");
    assert.equal(captureCalls.length, 1, "the hook must record exactly one capture");
    return recorded(captureCalls[0]);
  }

  async function assertRecordedWithout(policy: CallbackCasePolicy): Promise<void> {
    const baseline = await captureFor({});
    assert.equal(baseline["action"], driver.action);
    assert.equal(recorded(baseline["metadata"])["outcome"], driver.outcome);
    assert.deepEqual(await captureFor(policy), baseline);
  }

  test(`${name}: a throwing action callback still records the capture under the default label`, async () => {
    await assertRecordedWithout({ action: throwing });
  });

  test(`${name}: an action callback returning a non-string records the capture under the default label`, async () => {
    await assertRecordedWithout({ action: (): unknown => 42 });
  });

  test(`${name}: an action callback returning a promise records the capture under the default label`, async () => {
    await assertRecordedWithout({ action: (): Promise<string> => Promise.resolve("async.label") });
  });

  test(`${name}: a throwing metadata callback still records the capture with the hook's own metadata`, async () => {
    await assertRecordedWithout({ metadata: throwing });
  });

  test(`${name}: a metadata callback returning a non-object records the capture with the hook's own metadata`, async () => {
    // Spreading the string would have added its indices as keys.
    await assertRecordedWithout({ metadata: (): unknown => "nope" });
  });

  test(`${name}: a metadata callback returning an array records the capture with the hook's own metadata`, async () => {
    await assertRecordedWithout({ metadata: (): unknown => ["a", "b"] });
  });

  test(`${name}: a failed callback is reported as a capture warning, not a guard outcome`, async () => {
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]): void => {
      warnings.push(args);
    };
    const restore = setLogLevel("warn");
    try {
      await captureFor({ action: throwing, metadata: throwing });
    } finally {
      console.warn = originalWarn;
      restore();
    }
    assert.equal(warnings.length, 1);
    const [format, action, error] = warnings.at(0) ?? [];
    assert.match(String(format), /capture for "%s" was recorded without a failed callback/);
    assert.doesNotMatch(String(format), /failing (open|closed)/);
    assert.equal(action, driver.action);
    assert.ok(error instanceof Error);
    assert.match(error.message, /the action callback/);
  });

  test(`${name}: callbacks that succeed set the capture label and metadata`, async () => {
    const capture = await captureFor({
      action: (): string => "callback.label",
      metadata: (): Record<string, string> => ({ "test.key": "from-callback" }),
    });
    assert.equal(capture["action"], "callback.label");
    const metadata = recorded(capture["metadata"]);
    assert.equal(metadata["test.key"], "from-callback");
    assert.equal(metadata["outcome"], driver.outcome);
  });
}
