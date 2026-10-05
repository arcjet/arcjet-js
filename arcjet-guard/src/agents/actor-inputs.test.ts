import assert from "node:assert/strict";
import { test } from "node:test";

import { setLogLevel } from "../../test/_shared/log-level.ts";
import { fakeRule } from "../../test/_shared/stub-client.ts";
import { policyInput } from "../policy-input.ts";
import type { RuleWithInput } from "../types.ts";
import { resolveActorInputs, resolveCallPolicy, warnDegraded } from "./actor-inputs.ts";

test("omits actor and inputs when the policy does not set them", async () => {
  const resolved = await resolveActorInputs({}, { id: "one" });
  assert.deepEqual(resolved, {});
});

test("passes static actor and inputs through", async () => {
  const inputs = { id: policyInput.server.string("one") };
  const resolved = await resolveActorInputs({ actor: "user-1", inputs }, { id: "ignored" });
  assert.equal(resolved.actor, "user-1");
  assert.deepEqual(resolved.inputs, inputs);
});

test("resolves actor and inputs from the call argument", async () => {
  const resolved = await resolveActorInputs(
    {
      actor: (input: { id: string }) => `actor-${input.id}`,
      inputs: (input: { id: string }) => ({ id: policyInput.server.string(input.id) }),
    },
    { id: "one" },
  );
  assert.equal(resolved.actor, "actor-one");
  assert.deepEqual(resolved.inputs, { id: policyInput.server.string("one") });
});

test("forwards every native argument to the resolvers", async () => {
  const resolved = await resolveActorInputs(
    {
      actor: (_input: { id: string }, runtime: { userId: string }) => runtime.userId,
      inputs: (input: { id: string }, runtime: { userId: string }) => ({
        id: policyInput.server.string(input.id),
        user: policyInput.server.string(runtime.userId),
      }),
    },
    { id: "one" },
    { userId: "user-9" },
  );
  assert.equal(resolved.actor, "user-9");
  assert.deepEqual(resolved.inputs, {
    id: policyInput.server.string("one"),
    user: policyInput.server.string("user-9"),
  });
});

test("awaits async resolvers", async () => {
  const resolved = await resolveActorInputs(
    {
      actor: (input: { id: string }) => Promise.resolve(`actor-${input.id}`),
      inputs: (input: { id: string }) =>
        Promise.resolve({
          id: policyInput.server.string(input.id),
        }),
    },
    { id: "two" },
  );
  assert.equal(resolved.actor, "actor-two");
  assert.deepEqual(resolved.inputs, { id: policyInput.server.string("two") });
});

test("propagates a resolver throw so the caller can fail closed", async () => {
  await assert.rejects(
    () =>
      resolveActorInputs(
        {
          inputs: (_arg: { id: string }) => {
            throw new Error("mapping failed");
          },
        },
        { id: "one" },
      ),
    /mapping failed/,
  );
});

test("resolveCallPolicy passes values given directly through unchanged", () => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentional: a rule given directly is not checked for an input
  const unbound = { type: "TEST" } as unknown as RuleWithInput;
  const resolved = resolveCallPolicy(
    { rules: [unbound], metadata: { k: "v" }, sessionId: "sess-1" },
    { id: "one" },
    "order.looked-up",
  );
  assert.deepEqual(resolved, {
    action: "order.looked-up",
    rules: [unbound],
    metadata: { k: "v" },
    sessionId: "sess-1",
    degraded: undefined,
  });
});

test("resolveCallPolicy keeps an empty static sessionId out of the call", () => {
  const resolved = resolveCallPolicy({ sessionId: "" }, {}, "tool.invoked");
  assert.equal(resolved.sessionId, undefined);
  assert.equal(resolved.degraded, undefined);
});

test("resolveCallPolicy uses the fallback for an action callback returning a non-string", () => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentional: test that runtime rejects non-strings
  const resolved = resolveCallPolicy({ action: () => 42 as unknown as string }, {}, "tool.invoked");
  assert.equal(resolved.action, "tool.invoked");
  assert.match(String(resolved.degraded?.message), /action callback did not return a string/);
});

test("resolveCallPolicy leaves out a metadata callback's promise and reports it", () => {
  const resolved = resolveCallPolicy(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentional: test that runtime rejects a promise
    { metadata: () => Promise.resolve({ key: "value" }) as unknown as Record<string, string> },
    {},
    "tool.invoked",
  );
  assert.equal(resolved.metadata, undefined);
  assert.match(String(resolved.degraded?.message), /metadata callback .* returned a promise/);
});

test("resolveCallPolicy uses the fallback for an action callback returning a promise", () => {
  const resolved = resolveCallPolicy(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentional: test that runtime rejects a promise
    { action: () => Promise.resolve("later.invoked") as unknown as string },
    {},
    "tool.invoked",
  );
  assert.equal(resolved.action, "tool.invoked");
  assert.match(String(resolved.degraded?.message), /action callback .* returned a promise/);
});

test("resolveCallPolicy drops a sessionId callback returning a non-string", () => {
  const resolved = resolveCallPolicy(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentional: test that runtime rejects non-strings
    { sessionId: () => 7 as unknown as string },
    {},
    "tool.invoked",
  );
  assert.equal(resolved.sessionId, undefined);
  assert.match(String(resolved.degraded?.message), /sessionId callback/);
});

test("resolveCallPolicy reports the first failure and still resolves the other fields", () => {
  const cause = new Error("rules exploded");
  const resolved = resolveCallPolicy(
    {
      rules: () => {
        throw cause;
      },
      metadata: () => {
        throw new Error("metadata exploded");
      },
      sessionId: () => "sess-2",
    },
    {},
    "tool.invoked",
  );
  assert.equal(resolved.rules, undefined);
  assert.equal(resolved.metadata, undefined);
  assert.equal(resolved.sessionId, "sess-2");
  assert.match(String(resolved.degraded?.message), /rules callback for "tool\.invoked" threw/);
  assert.equal(resolved.degraded?.cause, cause);
});

test("resolveCallPolicy accepts bound rules and an empty array from a callback", () => {
  assert.deepEqual(
    resolveCallPolicy({ rules: (): RuleWithInput[] => [fakeRule] }, {}, "a.b").rules,
    [fakeRule],
  );
  const empty = resolveCallPolicy({ rules: (): RuleWithInput[] => [] }, {}, "a.b");
  assert.deepEqual(empty.rules, []);
  assert.equal(empty.degraded, undefined);
});

test("warnDegraded says whether it failed open or closed, and only when warnings are on", () => {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]): void => {
    warnings.push(args);
  };
  const restore = setLogLevel("warn");
  try {
    warnDegraded("a.b", false, new Error("x"));
    warnDegraded("a.b", true, new Error("y"));
    restore();
    const quiet = setLogLevel(undefined);
    warnDegraded("a.b", true, new Error("z"));
    quiet();
  } finally {
    console.warn = originalWarn;
    restore();
  }
  assert.equal(warnings.length, 2);
  assert.match(String(warnings[0]?.[0]), /failing open/);
  assert.match(String(warnings[1]?.[0]), /failing closed/);
});

test("resolveCallPolicy sends an action callback's string unchanged, valid label or not", () => {
  const resolved = resolveCallPolicy({ action: (): string => "Bash.invoked" }, {}, "tool.invoked");
  assert.equal(resolved.action, "Bash.invoked");
  assert.equal(resolved.degraded, undefined);
});
